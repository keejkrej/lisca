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
 *   bun lisca install landing
 *   bun lisca build landing
 *   bun lisca build workspace webs
 *   bun lisca build workspace all
 *   bun lisca dist aligner
 *   bun lisca typecheck annotator server
 *   bun lisca preview studio
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const {
  LISCA_APP_PORTS,
  LISCA_MOBILE_PORTS,
  liscaMobileExpoPort,
} = require("./lisca-dev-ports.cjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PRODUCTS = new Set(["aligner", "annotator", "studio", "landing"]);
const SCOPES = new Set([...PRODUCTS, "workspace"]);
const TYPECHECK_TARGETS = new Set(["desktop", "web", "demo", "server", "mobile", "all"]);
const APP_TARGETS = new Set(["desktop", "web", "demo", "server", "mobile"]);
const LANDING_TARGETS = new Set(["web", "site"]);
const WORKSPACE_BUILD_TARGETS = new Set(["all", "packages", "webs"]);

const dash = process.argv.indexOf("--");
const argv = dash === -1 ? process.argv.slice(2) : process.argv.slice(2, dash);
const turboExtra = dash === -1 ? [] : process.argv.slice(dash + 1);

const [task, scope, targetArg] = argv;

function usage() {
  console.error(`
Usage: bun lisca <task> <scope> [target] [-- <turbo passthrough>]

  task    dev | build | dist | typecheck | preview | install
  scope   aligner | annotator | studio | landing | workspace

Product targets (aligner, annotator, studio):
  desktop | web | demo | server | mobile | all

Landing targets:
  web | site   (aliases — both build the marketing site bundle)

Workspace targets:
  build     all | packages | webs
  dev       all (default)

Defaults:
  dev, build (product)   → desktop (Electron stack; desktop scripts pull web + Rust)
  dev web (product)    → web + server (Vite on 876x, Rust on 976x)
  dev mobile (product) → Expo web + server (http://localhost:808x, API proxied to Rust on 876x)
  dev server (product) → Rust backend only
  dev, build (landing) → web
  typecheck (product)  → all packages matching @lisca/<product>-*
  preview              → web (Vite preview)

Mobile dev runs Expo in the browser (not via turbo). Open the 808x URL; API traffic is proxied to Rust on 876x.

Examples:
  bun lisca dev aligner
  bun lisca dev annotator web
  bun lisca dev aligner mobile
  bun lisca dev landing
  bun lisca install landing
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

  if (t === "mobile-web") {
    console.error('Target "mobile-web" was removed. Use: bun lisca dev <scope> mobile');
    process.exit(1);
  }

  if (!APP_TARGETS.has(t)) {
    console.error(
      `Invalid target "${t}". Use: desktop | web | demo | server | mobile | all`,
    );
    process.exit(1);
  }

  if (taskName === "preview" && t !== "web" && t !== "demo") {
    console.error(
      'preview only applies to "web" or "demo" (Vite). Example: bun lisca preview aligner demo',
    );
    process.exit(1);
  }

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

function runLandingInstall(extra = turboExtra) {
  const result = spawnSync(
    "bun",
    ["install", "--filter", "@lisca/landing-web", "--ignore-scripts", ...extra],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  process.exit(result.status ?? 1);
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

function spawnDevServer(scopeName, { backend = false } = {}) {
  const ports = LISCA_APP_PORTS[scopeName];
  if (!ports) {
    console.error(`No dev ports configured for scope "${scopeName}".`);
    process.exit(1);
  }
  const port = backend ? ports.backendPort : ports.publicPort;
  return spawn("bun", ["x", "turbo", "run", "dev", `--filter=@lisca/${scopeName}-server`], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
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
      spawnSync("bun", ["x", "turbo", "run", "dev", `--filter=@lisca/${scopeName}-web`, ...turboExtra], {
        cwd: root,
        stdio: "inherit",
        shell: process.platform === "win32",
      }).status,
  });
}

function spawnMobileDevProxy(scopeName) {
  const mobilePort = LISCA_MOBILE_PORTS[scopeName];
  const rustPort = LISCA_APP_PORTS[scopeName]?.publicPort;
  if (!mobilePort || !rustPort) {
    console.error(`No mobile dev ports configured for scope "${scopeName}".`);
    process.exit(1);
  }
  const expoPort = liscaMobileExpoPort(mobilePort);
  return spawn(
    process.execPath,
    [
      path.join(root, "scripts/lisca-mobile-dev-proxy.cjs"),
      "--listen",
      String(mobilePort),
      "--expo",
      String(expoPort),
      "--rust",
      String(rustPort),
    ],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
}

function runMobileDev(scopeName) {
  const mobileDir = path.join(root, "apps", scopeName, "mobile");
  const mobilePort = LISCA_MOBILE_PORTS[scopeName];
  if (!mobilePort) {
    console.error(`No mobile port configured for scope "${scopeName}".`);
    process.exit(1);
  }
  const expoPort = liscaMobileExpoPort(mobilePort);

  const build = spawnSync(
    "bun",
    ["x", "turbo", "run", "build", `--filter=@lisca/${scopeName}-mobile^...`],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (build.status !== 0) process.exit(build.status ?? 1);

  const server = spawnDevServer(scopeName, { backend: false });
  const rustPort = LISCA_APP_PORTS[scopeName].publicPort;
  /** @type {import("node:child_process").ChildProcess | undefined} */
  let proxy;
  const stopChildren = () => {
    if (!server.killed) server.kill("SIGTERM");
    if (proxy && !proxy.killed) proxy.kill("SIGTERM");
  };
  const onSignal = () => {
    stopChildren();
    process.exit(130);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  if (!waitForTcpPort(rustPort, { label: `@lisca/${scopeName}-server` })) {
    stopChildren();
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    process.exit(1);
  }

  proxy = spawnMobileDevProxy(scopeName);

  console.log(`\n[lisca] mobile web UI: http://localhost:${mobilePort}\n`);

  const status = spawnSync("bun", ["run", "dev", ...turboExtra], {
    cwd: mobileDir,
    env: { ...process.env, EXPO_DEV_SERVER_PORT: String(expoPort) },
    stdio: "inherit",
    shell: process.platform === "win32",
  }).status;

  stopChildren();
  process.removeListener("SIGINT", onSignal);
  process.removeListener("SIGTERM", onSignal);
  process.exit(status ?? 1);
}

function main() {
  if (!task || !scope || argv.includes("-h") || argv.includes("--help")) {
    usage();
    process.exit(task ? 0 : 1);
  }

  if (!["dev", "build", "dist", "typecheck", "preview", "install"].includes(task)) {
    console.error(`Unknown task "${task}". Use: dev | build | dist | typecheck | preview | install`);
    process.exit(1);
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
    console.error("dist does not apply to landing. Use: bun lisca build landing");
    process.exit(1);
  }

  if (task === "dev" && !isWorkspace(scope) && !isLanding(scope) && targetArg === "web") {
    runWebDev(scope);
    return;
  }

  if (task === "dev" && !isWorkspace(scope) && targetArg === "mobile") {
    runMobileDev(scope);
    return;
  }

  const filters = filtersFor(task, scope, targetArg);
  runTurbo(task, { filters });
}

main();
