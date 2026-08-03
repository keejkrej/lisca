/**
 * Small Node helpers replacing Bun.spawn / Bun.spawnSync for root scripts.
 */
import { spawn, spawnSync, type SpawnSyncOptions } from "node:child_process";
import type { ChildProcess } from "node:child_process";

export function runSync(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    ok?: boolean;
    capture?: boolean;
  } = {},
): string {
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
