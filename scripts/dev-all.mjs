import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const apps = [
  { name: "core-api", type: "python", dir: path.join(rootDir, "services", "core-api"), port: 8000 },
  { name: "hospital-web", type: "next", dir: path.join(rootDir, "apps", "hospital-web"), port: 3000 },
  { name: "pharmacy-pos", type: "next", dir: path.join(rootDir, "apps", "pharmacy-pos"), port: 3001 },
  { name: "patient-store", type: "next", dir: path.join(rootDir, "apps", "patient-store"), port: 3002 },
];

let shuttingDown = false;
const processMap = new Map();

function startApp(app) {
  if (shuttingDown) return;
  console.log(`[runner] Starting ${app.name} on port ${app.port}...`);

  let proc;
  if (app.type === "python") {
    proc = spawn("python", ["-m", "uvicorn", "app.main:app", "--reload", "--port", String(app.port)], {
      cwd: app.dir,
      stdio: ["pipe", "inherit", "inherit"],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });
  } else {
    const nextBin = require.resolve("next/dist/bin/next", { paths: [app.dir] });
    // stdio: ['pipe', 'inherit', 'inherit'] keeps stdin open so Next.js does not exit on EOF
    proc = spawn(process.execPath, [nextBin, "dev", "-p", String(app.port)], {
      cwd: app.dir,
      stdio: ["pipe", "inherit", "inherit"],
      env: {
        ...process.env,
        PORT: String(app.port),
        NEXT_TELEMETRY_DISABLED: "1",
        CI: "1", // Prevents interactive keypress prompts in Next.js
      },
    });
  }

  // Keep stdin stream open
  proc.stdin?.resume?.();

  processMap.set(app.name, proc);

  proc.on("exit", (code, signal) => {
    processMap.delete(app.name);
    console.log(`[runner] ${app.name} exited with code=${code} signal=${signal}`);
    if (!shuttingDown) {
      console.log(`[runner] Respawning ${app.name} in 2000ms...`);
      setTimeout(() => startApp(app), 2000);
    }
  });
}

for (const app of apps) {
  startApp(app);
}

const cleanup = () => {
  shuttingDown = true;
  console.log("[runner] Shutting down all dev servers...");
  for (const [name, proc] of processMap.entries()) {
    try {
      proc.kill();
    } catch {}
  }
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// Keep runner event loop alive
setInterval(() => {}, 60000);
