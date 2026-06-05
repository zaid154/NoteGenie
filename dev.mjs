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

// Try to bind to a port; if busy, try the next one.
async function findFreePort(start, maxAttempts = 50) {
  let port = start;
  for (let i = 0; i < maxAttempts; i++) {
    if (!(await isBusy(port))) return port;
    port++;
  }
  throw new Error(`No free port found starting from ${start}`);
}

function portNote(requested, actual) {
  if (requested === actual) return "";
  return ` (${requested} was busy, using ${actual})`;
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

  const serverPort = await findFreePort(requestedServer);
  let clientPort = await findFreePort(requestedClient);
  // Client aur server same port pe na chalein.
  if (clientPort === serverPort) {
    clientPort = await findFreePort(serverPort + 1);
  }

  const clientUrl = `http://localhost:${clientPort}`;

  console.log("");
  console.log("  NoteGenie dev server");
  console.log("  --------------------");
  console.log(`  Frontend:  ${clientUrl}${portNote(requestedClient, clientPort)}`);
  console.log(`  Backend:   http://localhost:${serverPort}${portNote(requestedServer, serverPort)}`);
  console.log("");
  if (requestedClient !== clientPort || requestedServer !== serverPort) {
    console.log("  Some ports were busy — using the free ones above.");
    console.log("  Update .env if you want fixed ports next time.");
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
      detached: true,
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
        shutdown(failed ? code || 1 : 0);
      }
    });

    children.push(child);
    return child;
  }

  spawnChild(
    "server",
    nodeScript("server", "nodemon/bin/nodemon.js", ["src/index.js"]),
    serverEnv
  );
  spawnChild("client", nodeScript("client", "vite/bin/vite.js"), clientEnv);

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  // Last-resort cleanup if process exits without going through shutdown().
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
  console.error("[dev] Failed to start:", err.message);
  process.exit(1);
});
