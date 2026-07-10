#!/usr/bin/env bun
/**
 * Unified CLI for product and workspace tasks.
 *
 * Usage:
 *   vp run lisca <task> <scope> [target] [-- <extra args>]
 *
 * Examples:
 *   vp run lisca dev aligner
 *   vp run lisca dev aligner web
 *   vp run lisca dev landing
 *   vp run lisca install landing
 *   vp run lisca build landing
 *   vp run lisca deploy landing
 *   vp run lisca build workspace webs
 *   vp run lisca build workspace all
 *   vp run lisca dist aligner
 *   vp run lisca typecheck annotator server
 *   vp run lisca preview studio
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { LISCA_APP_PORTS } = require("./lisca-dev-ports.cjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PRODUCTS = new Set(["aligner", "annotator", "studio", "landing"]);
const SCOPES = new Set([...PRODUCTS, "workspace"]);
const TYPECHECK_TARGETS = new Set(["desktop", "web", "demo", "server", "all"]);
const APP_TARGETS = new Set(["desktop", "web", "demo", "server", "all"]);
const LANDING_TARGETS = new Set(["web", "site"]);
const WORKSPACE_BUILD_TARGETS = new Set(["all", "packages", "webs"]);

const dash = process.argv.indexOf("--");
const argv = dash === -1 ? process.argv.slice(2) : process.argv.slice(2, dash);
const extraArgs = dash === -1 ? [] : process.argv.slice(dash + 1);

const [task, scope, targetArg] = argv;

function usage() {
  console.error(`
Usage: vp run lisca <task> <scope> [target] [-- <passthrough args>]

  task    dev | build | dist | deploy | typecheck | preview | install
  scope   aligner | annotator | studio | landing | workspace

  Product targets (aligner, annotator, studio):
    desktop | web | demo | server | all

  Landing targets:
    web | site   (aliases — both build the marketing site bundle)

  Workspace targets:
    build     all | packages | webs
    dev       all (default)

  Defaults:
    dev, build (product)   → desktop (Tauri stack; desktop scripts pull web + Rust)
    dev web (product)      → web + server (Vite on 876x, Rust on 976x)
    dist desktop           → Tauri installers (default)
    dev server (product)   → Rust backend only
    dev, build (landing)   → web
    typecheck (product)    → all packages matching @lisca/<product>-*
    preview                → web (Vite preview)

  Examples:
    vp run lisca dev aligner
    vp run lisca dev annotator web
    vp run lisca dev landing
    vp run lisca install landing
    vp run lisca build landing
    vp run lisca build workspace all
    vp run lisca build workspace packages
    vp run lisca build workspace webs
    vp run lisca dist aligner
    vp run lisca typecheck aligner server
    vp run lisca preview studio demo
`);
}

function isLanding(scopeName) {
  return scopeName === "landing";
}

function isWorkspace(scopeName) {
  return scopeName === "workspace";
}

function packageForTarget(scopeName, target) {
  return `${scopeName}-${target}`;
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
    if (!TYPECHECK_TARGETS.has(t)) {
      console.error(
        `Invalid typecheck target "${t}". Use: web | demo | server | desktop | all`,
      );
      process.exit(1);
    }
    return [`@lisca/${packageForTarget(scopeName, t)}`];
  }

  let t = target;
  if (!t) {
    if (taskName === "preview") t = "web";
    else t = "desktop";
  }

  if (!APP_TARGETS.has(t)) {
    console.error(`Invalid target "${t}". Use: desktop | web | demo | server | all`);
    process.exit(1);
  }

  if (taskName === "preview" && t !== "web" && t !== "demo") {
    console.error(
      'preview only applies to "web" or "demo" (Vite). Example: vp run lisca preview aligner demo',
    );
    process.exit(1);
  }

  return [`@lisca/${packageForTarget(scopeName, t)}`];
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

function runLandingInstall(extra = extraArgs) {
  const result = spawnSync(
    "bun",
    ["install", "--filter", "@lisca/landing-web", "--ignore-scripts", ...extra],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  process.exit(result.status ?? 1);
}

function runTask(taskName, { filters = [], extra = extraArgs, env = {} } = {}) {
  const cmd = ["run", "--no-cache"];
  for (const filter of filters) cmd.push("--filter", filter);
  cmd.push(taskName, ...extra);

  const result = spawnSync("vp", cmd, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });
  process.exit(result.status ?? 1);
}

function envFor(taskName, scopeName, target) {
  if (taskName !== "build") return {};

  // Demo packages export TypeScript source; skip their standalone Vite builds on
  // landing deploy (saves two heavy React Compiler passes that OOM on Render).
  if (isLanding(scopeName)) {
    return { LISCA_BUILD_DEMO_SITE: "0" };
  }

  if (target === "demo" || (isWorkspace(scopeName) && target === "webs")) {
    return { LISCA_BUILD_DEMO_SITE: "1" };
  }

  return {};
}

function spawnDevServer(scopeName, { backend = false, host } = {}) {
  const ports = LISCA_APP_PORTS[scopeName];
  if (!ports) {
    console.error(`No dev ports configured for scope "${scopeName}".`);
    process.exit(1);
  }
  const port = backend ? ports.backendPort : ports.publicPort;
  const env = { ...process.env, PORT: String(port) };
  if (host) env.HOST = host;
  return spawn("vp", ["run", "--no-cache", "--filter", `@lisca/${scopeName}-server`, "dev"], {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function waitForTcpPort(port, { timeoutMs = 120_000, label = "server" } = {}) {
  const target = `tcp:127.0.0.1:${port}`;
  console.log(`[lisca] waiting for ${label} (${target})…`);
  const result = spawnSync("bun", ["x", "wait-on", "-t", String(timeoutMs), target], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`[lisca] ${label} did not become ready on ${target}`);
    return false;
  }
  return true;
}

function runDevWithServer(scopeName, { backend = false, run }) {
  const ports = LISCA_APP_PORTS[scopeName];
  const server = spawnDevServer(scopeName, { backend });
  const stopServer = () => {
    if (!server.killed) server.kill("SIGTERM");
  };
  const onSignal = () => {
    stopServer();
    process.exit(130);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  const waitPort = backend ? ports.backendPort : ports.publicPort;
  if (!waitForTcpPort(waitPort, { label: `@lisca/${scopeName}-server` })) {
    stopServer();
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    process.exit(1);
  }

  const status = run();
  stopServer();
  process.removeListener("SIGINT", onSignal);
  process.removeListener("SIGTERM", onSignal);
  process.exit(status ?? 1);
}

function runWebDev(scopeName) {
  runDevWithServer(scopeName, {
    backend: true,
    run: () =>
      spawnSync(
        "vp",
        ["run", "--no-cache", "--filter", `@lisca/${scopeName}-web`, "dev", ...extraArgs],
        {
          cwd: root,
          stdio: "inherit",
          shell: process.platform === "win32",
        },
      ).status,
  });
}

function main() {
  if (!task || !scope || argv.includes("-h") || argv.includes("--help")) {
    usage();
    process.exit(task ? 0 : 1);
  }

  if (!["dev", "build", "dist", "deploy", "typecheck", "preview", "install"].includes(task)) {
    console.error(
      `Unknown task "${task}". Use: dev | build | dist | deploy | typecheck | preview | install`,
    );
    process.exit(1);
  }

  if (task === "deploy") {
    if (!isLanding(scope)) {
      console.error("deploy only supports scope landing.");
      process.exit(1);
    }
    const status = spawnSync(
      "bun",
      [path.join(root, "scripts/deploy-landing.mjs"), ...extraArgs],
      {
        cwd: root,
        stdio: "inherit",
        shell: process.platform === "win32",
      },
    ).status;
    process.exit(status ?? 1);
  }

  if (task === "install") {
    if (!isLanding(scope)) {
      console.error("install only supports scope landing (minimal deploy dependencies).");
      process.exit(1);
    }
    runLandingInstall();
    return;
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
    console.error("dist does not apply to landing. Use: vp run lisca build landing");
    process.exit(1);
  }

  if (task === "dev" && !isWorkspace(scope) && !isLanding(scope) && targetArg === "web") {
    runWebDev(scope);
    return;
  }

  const filters = filtersFor(task, scope, targetArg);
  runTask(task, { filters, env: envFor(task, scope, targetArg) });
}

main();