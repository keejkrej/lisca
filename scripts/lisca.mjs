#!/usr/bin/env bun
/**
 * Unified CLI for product and workspace tasks.
 *
 * Usage:
 *   bun lisca <task> <scope> [target] [-- <extra turbo args>]
 *
 * Examples:
 *   bun lisca dev aligner
 *   bun lisca dev aligner web
 *   bun lisca dev aligner mobile
 *   bun lisca dev landing
 *   bun lisca build landing
 *   bun lisca build workspace webs
 *   bun lisca build workspace all
 *   bun lisca dist aligner
 *   bun lisca typecheck annotator server
 *   bun lisca preview studio
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PRODUCTS = new Set(["aligner", "annotator", "studio", "landing"]);
const SCOPES = new Set([...PRODUCTS, "workspace"]);
const TYPECHECK_TARGETS = new Set(["desktop", "web", "demo", "server", "mobile", "all"]);
const APP_TARGETS = new Set(["desktop", "web", "demo", "server", "mobile", "mobile-web"]);
const LANDING_TARGETS = new Set(["web", "site"]);
const WORKSPACE_BUILD_TARGETS = new Set(["all", "packages", "webs"]);

const MOBILE_PORTS = {
  aligner: 8081,
  annotator: 8082,
  studio: 8083,
};

const dash = process.argv.indexOf("--");
const argv = dash === -1 ? process.argv.slice(2) : process.argv.slice(2, dash);
const turboExtra = dash === -1 ? [] : process.argv.slice(dash + 1);

const [task, scope, targetArg] = argv;

function usage() {
  console.error(`
Usage: bun lisca <task> <scope> [target] [-- <turbo passthrough>]

  task    dev | build | dist | typecheck | preview
  scope   aligner | annotator | studio | landing | workspace

Product targets (aligner, annotator, studio):
  desktop | web | demo | server | mobile | mobile-web | all

Landing targets:
  web | site   (aliases — both build the marketing site bundle)

Workspace targets:
  build     all | packages | webs
  dev       all (default)

Defaults:
  dev, build (product)   → desktop (Electron stack; desktop scripts pull web + Rust)
  dev, build (landing) → web
  typecheck (product)  → all packages matching @lisca/<product>-*
  preview              → web (Vite preview)

Mobile dev runs Expo directly (not via turbo) so the CLI accepts i/a/w keys.
Use mobile-web to open the RN app in a browser for quick UI iteration.

Examples:
  bun lisca dev aligner
  bun lisca dev annotator web
  bun lisca dev aligner mobile
  bun lisca dev aligner mobile-web
  bun lisca dev landing
  bun lisca build landing
  bun lisca build workspace all
  bun lisca build workspace packages
  bun lisca build workspace webs
  bun lisca dist aligner
  bun lisca typecheck aligner server
  bun lisca preview studio demo
`);
}

function isLanding(scopeName) {
  return scopeName === "landing";
}

function isWorkspace(scopeName) {
  return scopeName === "workspace";
}

function landingFilters(taskName, target) {
  const t = target ?? (taskName === "typecheck" ? "all" : "web");
  if (!LANDING_TARGETS.has(t) && !(taskName === "typecheck" && t === "all")) {
    console.error(
      `Landing only supports target web | site${taskName === "typecheck" ? " | all" : ""}.`,
    );
    process.exit(1);
  }
  if (t === "all") return ["@lisca/landing-*"];
  return ["@lisca/landing-web"];
}

function productFilter(taskName, scopeName, target) {
  if (taskName === "typecheck") {
    const t = target ?? "all";
    if (t === "all") return [`@lisca/${scopeName}-*`];
    if (t === "mobile-web") return [`@lisca/${scopeName}-mobile`];
    if (!TYPECHECK_TARGETS.has(t)) {
      console.error(
        `Invalid typecheck target "${t}". Use: web | demo | server | desktop | mobile | all`,
      );
      process.exit(1);
    }
    return [`@lisca/${scopeName}-${t}`];
  }

  let t = target;
  if (!t) {
    if (taskName === "preview") t = "web";
    else t = "desktop";
  }

  if (!APP_TARGETS.has(t)) {
    console.error(
      `Invalid target "${t}". Use: desktop | web | demo | server | mobile | mobile-web`,
    );
    process.exit(1);
  }

  if (taskName === "preview" && t !== "web" && t !== "demo") {
    console.error(
      'preview only applies to "web" or "demo" (Vite). Example: bun lisca preview aligner demo',
    );
    process.exit(1);
  }

  if (t === "mobile-web") return [`@lisca/${scopeName}-mobile`];

  return [`@lisca/${scopeName}-${t}`];
}

function workspaceFilters(taskName, target) {
  const t = target ?? "all";

  if (taskName === "build") {
    if (!WORKSPACE_BUILD_TARGETS.has(t)) {
      console.error(`Invalid workspace build target "${t}". Use: all | packages | webs`);
      process.exit(1);
    }
    if (t === "all") return [];
    if (t === "packages") return ["./packages/*"];
    return ["@lisca/*-web", "@lisca/*-demo", "@lisca/landing-web"];
  }

  if (taskName === "dev") {
    if (t !== "all") {
      console.error(`Invalid workspace dev target "${t}". Use: all`);
      process.exit(1);
    }
    return [];
  }

  console.error(`task "${taskName}" does not apply to workspace scope.`);
  process.exit(1);
}

function filtersFor(taskName, scopeName, target) {
  if (isWorkspace(scopeName)) return workspaceFilters(taskName, target);
  if (isLanding(scopeName)) return landingFilters(taskName, target);
  return productFilter(taskName, scopeName, target);
}

function runTurbo(taskName, { filters = [], extra = turboExtra } = {}) {
  const cmd = ["x", "turbo", "run", taskName];
  for (const filter of filters) cmd.push(`--filter=${filter}`);
  cmd.push(...extra);

  const result = spawnSync("bun", cmd, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  process.exit(result.status ?? 1);
}

function runMobileDev(scopeName, { web = false } = {}) {
  const mobileDir = path.join(root, "apps", scopeName, "mobile");
  const port = MOBILE_PORTS[scopeName];
  if (!port) {
    console.error(`No mobile port configured for scope "${scopeName}".`);
    process.exit(1);
  }

  const build = spawnSync(
    "bun",
    ["x", "turbo", "run", "build", `--filter=@lisca/${scopeName}-mobile^...`],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (build.status !== 0) process.exit(build.status ?? 1);

  const script = web ? "dev:web" : "dev";
  const result = spawnSync("bun", ["run", script, ...turboExtra], {
    cwd: mobileDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  process.exit(result.status ?? 1);
}

function main() {
  if (!task || !scope || argv.includes("-h") || argv.includes("--help")) {
    usage();
    process.exit(task ? 0 : 1);
  }

  if (!["dev", "build", "dist", "typecheck", "preview"].includes(task)) {
    console.error(`Unknown task "${task}". Use: dev | build | dist | typecheck | preview`);
    process.exit(1);
  }

  if (!SCOPES.has(scope)) {
    console.error(
      `Unknown scope "${scope}". Use: aligner | annotator | studio | landing | workspace`,
    );
    process.exit(1);
  }

  if (isWorkspace(scope) && ["dist", "typecheck", "preview"].includes(task)) {
    console.error(`task "${task}" does not apply to workspace. Use a product scope instead.`);
    process.exit(1);
  }

  if (isLanding(scope) && task === "dist") {
    console.error("dist does not apply to landing. Use: bun lisca build landing");
    process.exit(1);
  }

  if (task === "dev" && !isWorkspace(scope) && (targetArg === "mobile" || targetArg === "mobile-web")) {
    runMobileDev(scope, { web: targetArg === "mobile-web" });
    return;
  }

  const filters = filtersFor(task, scope, targetArg);
  runTurbo(task, { filters });
}

main();
