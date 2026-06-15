import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const processes = [];

function start(name, args) {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: ["inherit", "pipe", "pipe"],
  });

  processes.push(child);

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on("exit", (code, signal) => {
    if (signal) return;
    if (code !== 0) {
      console.error(`[${name}] stopped with code ${code}`);
      stopAll();
      process.exit(code ?? 1);
    }
  });
}

function stopAll() {
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});

start("api", ["run", "server"]);
start("web", ["run", "dev"]);
