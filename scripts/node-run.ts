/**
 * Small Node helpers replacing Bun.spawn / Bun.spawnSync for root scripts.
 */
import { spawn, spawnSync, type SpawnSyncOptions } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { ChildProcess } from "node:child_process";

type RunSyncOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  ok?: boolean;
  capture?: boolean;
};

export function runSync(command: string, args: string[], options: RunSyncOptions = {}): string {
  const spawnOpts: SpawnSyncOptions = {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
  };
  const result = spawnSync(command, args, spawnOpts);
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !options.ok) {
    process.exit(result.status ?? 1);
  }
  return (result.stdout ?? "").toString().trim();
}

/**
 * Run the local Vite+ CLI without relying on platform-specific package-manager
 * shims such as `vp.cmd`.
 */
export function runVpSync(args: string[], options: RunSyncOptions = {}): string {
  const vitePlusCli = fileURLToPath(import.meta.resolve("vite-plus/bin"));
  return runSync(process.execPath, [vitePlusCli, ...args], options);
}

export function spawnInherit(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): ChildProcess {
  return spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: "inherit",
  });
}
