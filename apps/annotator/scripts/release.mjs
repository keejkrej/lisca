import { spawnSync } from "node:child_process";

const args = ["@tauri-apps/cli", "build"];

if (process.platform === "linux") {
  args.push("--no-bundle");
}

const result = spawnSync("bunx", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
