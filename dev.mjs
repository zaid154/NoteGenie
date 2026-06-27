import { spawn, spawnSync, execFile } from "child_process";
import { promisify } from "util";
import { connect } from "net";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const isWin = process.platform === "win32";

// Simple .env parser — no extra dependencies.
function loadEnvFile() {
  const env = {};
  try {
    const text = readFileSync(resolve(root, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  } catch {
    // .env missing — defaults will apply.
  }
  return env;
}

function buildClientUrl(fileEnv, clientPort) {
  const raw = fileEnv.CLIENT_URL?.trim();
  if (!raw) return `http://localhost:${clientPort}`;
  try {
    const u = new URL(raw);
    u.port = String(clientPort);
    // Local dev always uses HTTP unless you terminate TLS in a reverse proxy.
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      u.protocol = "http:";
    }
    return u.origin;
  } catch {
    return `http://localhost:${clientPort}`;
  }
}

// Check if something is already listening (works for IPv4 + IPv6).
function portInUse(port, host) {
  return new Promise((resolvePort) => {
    const socket = connect({ port, host, timeout: 400 }, () => {
      socket.destroy();
      resolvePort(true);
    });
    socket.on("error", () => resolvePort(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolvePort(false);
    });
  });
}

async function isBusy(port) {
  const v4 = await portInUse(port, "127.0.0.1");
  const v6 = await portInUse(port, "::1");
  return v4 || v6;
}

// Poll until the backend is accepting connections, so the client's first /api requests don't
// hit ECONNREFUSED while the server is still connecting to MongoDB.
async function waitForServer(port, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isBusy(port)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false; // timed out — start the client anyway
}

/** Best-effort: which process is listening on this port (for error messages). */
async function getPortOwner(port) {
  try {
    if (isWin) {
      const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"], {
        windowsHide: true,
      });
      const portRe = new RegExp(`:${port}\\s`);
      for (const line of stdout.split("\n")) {
        if (!/LISTENING/.test(line) || !portRe.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (!pid || !/^\d+$/.test(pid)) continue;
        try {
          const { stdout: tasks } = await execFileAsync(
            "tasklist",
            ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"],
            { windowsHide: true }
          );
          const name = tasks.split(",")[0]?.replace(/"/g, "").trim();
          if (name && !/no tasks/i.test(name)) {
            return { pid, name };
          }
        } catch {
          // fall through
        }
        return { pid, name: "unknown" };
      }
      return null;
    }

    const { stdout } = await execFileAsync("lsof", [
      "-i",
      `TCP:${port}`,
      "-sTCP:LISTEN",
      "-t",
    ]);
    const pid = stdout.trim().split("\n")[0];
    if (!pid) return null;
    try {
      const { stdout: psOut } = await execFileAsync("ps", ["-p", pid, "-o", "comm="]);
      return { pid, name: psOut.trim() || "unknown" };
    } catch {
      return { pid, name: "unknown" };
    }
  } catch {
    return null;
  }
}

function formatPortBusyNote(label, envKey, requested, actual, owner) {
  if (requested === actual) return "";
  const lines = [`  ${label}: .env ${envKey}=${requested} was busy`];
  if (owner?.pid) {
    lines.push(`    → in use by ${owner.name} (PID ${owner.pid})`);
  }
  lines.push(`    → using port ${actual} instead`);
  return lines.join("\n");
}

// Prefer .env port; if busy, try the next free one and report what blocked it.
async function resolvePort(label, envKey, requested, avoidPorts = new Set(), maxAttempts = 50) {
  if (!(await isBusy(requested)) && !avoidPorts.has(requested)) {
    return { port: requested, requested, owner: null, fallback: false };
  }

  const owner = await getPortOwner(requested);
  let port = requested + 1;
  for (let i = 0; i < maxAttempts; i++) {
    if (!avoidPorts.has(port) && !(await isBusy(port))) {
      return { port, requested, owner, fallback: true };
    }
    port++;
  }
  const who = owner?.pid ? ` (${owner.name}, PID ${owner.pid} on ${requested})` : "";
  throw new Error(
    `  ${label}: no free port found near .env ${envKey}=${requested}${who}.`
  );
}

// Run nodemon/vite via node so we skip npm.cmd shells on Windows.
function nodeScript(subdir, relativeScript, scriptArgs = []) {
  return {
    cwd: resolve(root, subdir),
    command: process.execPath,
    args: [resolve(root, subdir, "node_modules", relativeScript), ...scriptArgs],
  };
}

async function killProcessTree(pid) {
  if (!pid) return;

  if (isWin) {
    try {
      await execFileAsync("taskkill", ["/pid", String(pid), "/t", "/f"], {
        windowsHide: true,
      });
    } catch {
      // Process may already be gone.
    }
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Already exited.
    }
  }
}

async function main() {
  const fileEnv = loadEnvFile();
  const requestedServer = Number(fileEnv.PORT) || 5000;
  const requestedClient = Number(fileEnv.CLIENT_PORT) || 5173;

  if (!Number.isFinite(requestedServer) || requestedServer < 1 || requestedServer > 65535) {
    throw new Error(`Invalid PORT in .env: ${fileEnv.PORT}`);
  }
  if (!Number.isFinite(requestedClient) || requestedClient < 1 || requestedClient > 65535) {
    throw new Error(`Invalid CLIENT_PORT in .env: ${fileEnv.CLIENT_PORT}`);
  }
  if (requestedServer === requestedClient) {
    throw new Error(
      `PORT and CLIENT_PORT must differ (both are ${requestedServer} in .env).`
    );
  }

  const server = await resolvePort("Backend", "PORT", requestedServer);
  const client = await resolvePort("Frontend", "CLIENT_PORT", requestedClient, new Set([server.port]));

  const serverPort = server.port;
  const clientPort = client.port;
  const clientUrl = buildClientUrl(fileEnv, clientPort);

  console.log("");
  console.log("  NoteGenie dev server");
  console.log("  --------------------");
  console.log(`  Frontend:  ${clientUrl}`);
  console.log(`  Backend:   http://localhost:${serverPort}`);
  console.log(`  Protocol:  HTTP (normal for local dev; HTTPS is for production behind a proxy)`);
  console.log("");

  const portNotes = [
    formatPortBusyNote("Backend", "PORT", server.requested, serverPort, server.owner),
    formatPortBusyNote("Frontend", "CLIENT_PORT", client.requested, clientPort, client.owner),
  ].filter(Boolean);
  if (portNotes.length) {
    console.log("  Port fallback (.env ports were busy):");
    for (const note of portNotes) console.log(note);
    console.log("");
  }

  if (serverPort === requestedServer && clientPort === requestedClient) {
    console.log(`  Using .env ports: CLIENT_PORT=${clientPort}, PORT=${serverPort}`);
    console.log("");
  }

  console.log("  Press Ctrl+C to stop both server and client.");
  console.log("");

  const serverEnv = {
    ...process.env,
    PORT: String(serverPort),
    CLIENT_URL: clientUrl,
  };

  const clientEnv = {
    ...process.env,
    CLIENT_PORT: String(clientPort),
    VITE_API_PORT: String(serverPort),
    CLIENT_URL: clientUrl,
  };

  const children = [];
  let shuttingDown = false;

  async function shutdown(exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\n  Stopping...");

    await Promise.all(children.map((child) => killProcessTree(child.pid)));
    process.exit(exitCode);
  }

  function spawnChild(label, script, env) {
    const { cwd, command, args } = script;
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: !isWin,
      windowsHide: true,
    });

    child.stdout.on("data", (d) => {
      process.stdout.write(`[${label}] ${d}`);
    });
    child.stderr.on("data", (d) => {
      process.stderr.write(`[${label}] ${d}`);
    });

    child.on("exit", (code, signal) => {
      if (shuttingDown) return;

      const failed = code !== 0 && code !== null;
      if (failed || signal) {
        const reason = signal ? `signal ${signal}` : `code ${code}`;
        console.error(`[${label}] exited unexpectedly (${reason})`);
        if (label === "server") {
          console.error("");
          console.error("  Common fixes:");
          console.error("  - Port busy: close the process shown above or change PORT in .env");
          console.error("  - MongoDB: check MONGO_URI in .env and Atlas IP whitelist");
          console.error("  - Missing deps: npm run install:all");
          console.error("");
        }
        shutdown(failed ? code || 1 : 0);
      }
    });

    child.on("error", (err) => {
      console.error(`[${label}] failed to start: ${err.message}`);
      if (label === "server" && err.code === "ENOENT") {
        console.error("  Run: npm install --prefix server");
      }
      if (label === "client" && err.code === "ENOENT") {
        console.error("  Run: npm install --prefix client");
      }
      shutdown(1);
    });

    children.push(child);
    return child;
  }

  spawnChild(
    "server",
    nodeScript("server", "nodemon/bin/nodemon.js", ["src/index.js"]),
    serverEnv
  );

  // Start the client only once the backend is listening (avoids the startup proxy ECONNREFUSED).
  console.log("  Waiting for backend to be ready...");
  await waitForServer(serverPort);
  if (!shuttingDown) {
    console.log("  Backend ready — starting frontend.\n");
    spawnChild("client", nodeScript("client", "vite/bin/vite.js"), clientEnv);
  }

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  process.on("exit", () => {
    for (const child of children) {
      if (!child.pid) continue;
      if (isWin) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
          windowsHide: true,
        });
      } else {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          try {
            process.kill(child.pid, "SIGKILL");
          } catch {
            // Already gone.
          }
        }
      }
    }
  });
}

main().catch((err) => {
  console.error("\n[dev] Failed to start:");
  console.error(err.message);
  if (isWin) {
    console.error("\n  Tip: Double-click start-dev.bat in the project folder so errors stay visible.");
  }
  process.exit(1);
});
