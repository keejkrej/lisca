#!/usr/bin/env bun
/**
 * Build landing locally and push prebuilt assets to deploy/landing for Render.
 *
 * Render serves the committed dist/ tree only (no install or build on their side).
 * Pushes to deploy/landing trigger a Render deploy automatically.
 *
 * Usage:
 *   vp run deploy:landing
 *   bun scripts/deploy-landing.ts [--skip-build]
 */
import { existsSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const DEPLOY_BRANCH = "deploy/landing";
const DIST_REL = "apps/landing/web/dist";
const WORKTREE = join(root, ".deploy/landing");

const skipBuild = process.argv.includes("--skip-build");

function run(command: string, args: string[], options: { cwd?: string; ok?: boolean } = {}): void {
  const result = Bun.spawnSync({
    cmd: [command, ...args],
    cwd: options.cwd ?? root,
    stdio: ["inherit", "inherit", "inherit"],
  });
  if (result.exitCode !== 0 && !options.ok) {
    process.exit(result.exitCode ?? 1);
  }
}

function capture(command: string, args: string[], options: { cwd?: string } = {}): string {
  const result = Bun.spawnSync({
    cmd: [command, ...args],
    cwd: options.cwd ?? root,
    stdio: ["pipe", "pipe", "inherit"],
  });
  return (result.stdout as string | null)?.trim() ?? "";
}

function ensureWorktree(): void {
  const gitMarker = join(WORKTREE, ".git");
  if (existsSync(gitMarker)) {
    return;
  }

  mkdirSync(dirname(WORKTREE), { recursive: true });
  const remote = capture("git", ["rev-parse", "--verify", `origin/${DEPLOY_BRANCH}`]);
  if (remote) {
    run("git", ["worktree", "add", "-B", DEPLOY_BRANCH, WORKTREE, `origin/${DEPLOY_BRANCH}`]);
    return;
  }

  const source = capture("git", ["branch", "--show-current"]);
  if (!source) {
    console.error("Detached HEAD — checkout a branch before deploying.");
    process.exit(1);
  }
  run("git", ["worktree", "add", "-B", DEPLOY_BRANCH, WORKTREE, source]);
}

if (!skipBuild) {
  run("vp", ["run", "--filter", "@lisca/landing-web", "build"]);
}

const distRoot = join(root, DIST_REL);
if (!existsSync(join(distRoot, "index.html"))) {
  console.error(`Missing ${DIST_REL}/index.html — run: vp run --filter @lisca/landing-web build`);
  process.exit(1);
}

const sourceSha = capture("git", ["rev-parse", "HEAD"]);
if (!sourceSha) {
  console.error("Not a git repository.");
  process.exit(1);
}

ensureWorktree();
run("git", ["reset", "--hard", sourceSha], { cwd: WORKTREE });
rmSync(join(WORKTREE, DIST_REL), { recursive: true, force: true });
cpSync(distRoot, join(WORKTREE, DIST_REL), { recursive: true });
run("git", ["add", "-f", DIST_REL], { cwd: WORKTREE });

const status = capture("git", ["status", "--porcelain"], { cwd: WORKTREE });
if (status) {
  run("git", ["commit", "-m", `deploy landing (${sourceSha.slice(0, 7)})`], { cwd: WORKTREE });
} else {
  console.log("[deploy-landing] dist unchanged since last deploy commit");
}

// deploy/landing is rewritten each run (reset to source + dist commit), not fast-forward.
run("git", ["fetch", "origin", DEPLOY_BRANCH], { ok: true });
run("git", ["push", "--force-with-lease", "-u", "origin", DEPLOY_BRANCH], { cwd: WORKTREE });

console.log(`
[deploy-landing] pushed ${DEPLOY_BRANCH} (${sourceSha.slice(0, 7)})

Render will deploy automatically from the push.
`);
