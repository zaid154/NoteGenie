import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Reads ports from dev.mjs (process.env) or root .env.
export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const env = loadEnv(mode, rootDir, "");

  const clientPort =
    Number(process.env.CLIENT_PORT) || Number(env.CLIENT_PORT) || 5173;
  const apiPort =
    Number(process.env.VITE_API_PORT) || Number(env.PORT) || 5000;

  return {
    plugins: [react()],
    server: {
      port: clientPort,
      strictPort: true,
      proxy: {
        "/api": {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
