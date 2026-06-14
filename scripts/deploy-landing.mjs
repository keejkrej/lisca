#!/usr/bin/env bun
/**
 * Build landing locally and push prebuilt assets to deploy/landing for Render.
 *
 * Render serves the committed dist/ tree only (no install or build on their side).
 * Auto-deploy is disabled in render.yaml — trigger deploy manually after push.
 *
 * Usage:
 *   bun lisca deploy landing
 *   bun scripts/deploy-landing.mjs [--skip-build]
 *
 * Optional env:
 *   RENDER_DEPLOY_HOOK_URL — GET/POST after a successful push to start a deploy
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPLOY_BRANCH = "deploy/landing";
const DIST_REL = "apps/landing/web/dist";
const WORKTREE = path.join(root, ".deploy/landing");

const skipBuild = process.argv.includes("--skip-build");

function run(command, args, { cwd = root, ok = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0 && !ok) {
    process.exit(result.status ?? 1);
  }
  return result;
}

function capture(command, args, { cwd = root } = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

function ensureWorktree() {
  const gitMarker = path.join(WORKTREE, ".git");
  if (fs.existsSync(gitMarker)) {
    return;
  }

  fs.mkdirSync(path.dirname(WORKTREE), { recursive: true });
  const remote = capture("git", ["rev-parse", "--verify", `origin/${DEPLOY_BRANCH}`]);
  if (remote.status === 0) {
    run("git", ["worktree", "add", "-B", DEPLOY_BRANCH, WORKTREE, `origin/${DEPLOY_BRANCH}`]);
    return;
  }

  const source = capture("git", ["branch", "--show-current"]).stdout.trim();
  if (!source) {
    console.error("Detached HEAD — checkout a branch before deploying.");
    process.exit(1);
  }
  run("git", ["worktree", "add", "-B", DEPLOY_BRANCH, WORKTREE, source]);
}

function triggerDeployHook() {
  const hook = process.env.RENDER_DEPLOY_HOOK_URL?.trim();
  if (!hook) {
    return;
  }

  console.log("[deploy-landing] triggering Render deploy hook…");
  const result = spawnSync("curl", ["-fsS", "-X", "POST", hook], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error("[deploy-landing] deploy hook request failed");
    process.exit(result.status ?? 1);
  }
  console.log("[deploy-landing] deploy hook accepted");
}

function main() {
  if (!skipBuild) {
    run("bun", ["lisca", "build", "landing"]);
  }

  const distRoot = path.join(root, DIST_REL);
  if (!fs.existsSync(path.join(distRoot, "index.html"))) {
    console.error(`Missing ${DIST_REL}/index.html — run: bun lisca build landing`);
    process.exit(1);
  }

  const sourceSha = capture("git", ["rev-parse", "HEAD"]).stdout.trim();
  if (!sourceSha) {
    console.error("Not a git repository.");
    process.exit(1);
  }

  ensureWorktree();
  run("git", ["reset", "--hard", sourceSha], { cwd: WORKTREE });
  fs.rmSync(path.join(WORKTREE, DIST_REL), { recursive: true, force: true });
  fs.cpSync(distRoot, path.join(WORKTREE, DIST_REL), { recursive: true });
  run("git", ["add", "-f", DIST_REL], { cwd: WORKTREE });

  const status = capture("git", ["status", "--porcelain"], { cwd: WORKTREE });
  if (status.stdout.trim()) {
    run("git", ["commit", "-m", `deploy landing (${sourceSha.slice(0, 7)})`], { cwd: WORKTREE });
  } else {
    console.log("[deploy-landing] dist unchanged since last deploy commit");
  }

  // deploy/landing is rewritten each run (reset to source + dist commit), not fast-forward.
  run("git", ["fetch", "origin", DEPLOY_BRANCH], { ok: true });
  run("git", ["push", "--force-with-lease", "-u", "origin", DEPLOY_BRANCH], { cwd: WORKTREE });

  console.log(`
[deploy-landing] pushed ${DEPLOY_BRANCH} (${sourceSha.slice(0, 7)})

Render auto-deploy is off. Either:
  • Dashboard → lisca-landing → Manual Deploy → Deploy latest commit
  • set RENDER_DEPLOY_HOOK_URL and re-run to trigger via hook
`);

  triggerDeployHook();
}

main();
