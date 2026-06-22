#!/usr/bin/env bun
/**
 * Unified CLI for product and workspace tasks.
 *
 * Usage:
 *   vp run lisca <task> <scope> [target] [-- <extra turbo args>]
 *
 * Examples:
 *   vp run lisca dev aligner
 *   vp run lisca dev aligner web
 *   vp run lisca dev aligner web-native
 *   vp run lisca dev aligner ios
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
const {
  LISCA_APP_PORTS,
  LISCA_MOBILE_PORTS,
  liscaMobileExpoPort,
} = require("./lisca-dev-ports.cjs");
const { resolveDevLanHost } = require("./lisca-dev-lan-host.cjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PRODUCTS = new Set(["aligner", "annotator", "studio", "landing"]);
const SCOPES = new Set([...PRODUCTS, "workspace"]);
const TYPECHECK_TARGETS = new Set(["desktop", "web", "demo", "server", "web-native", "all"]);
const APP_TARGETS = new Set(["desktop", "web", "demo", "server", "web-native", "all"]);
const RENAMED_TARGETS = new Set(["mobile", "mobile-web"]);
const DEV_ONLY_TARGETS = new Set(["ios-install"]);
const LANDING_TARGETS = new Set(["web", "site"]);
const WORKSPACE_BUILD_TARGETS = new Set(["all", "packages", "webs"]);

const dash = process.argv.indexOf("--");
const argv = dash === -1 ? process.argv.slice(2) : process.argv.slice(2, dash);
const turboExtra = dash === -1 ? [] : process.argv.slice(dash + 1);

const [task, scope, targetArg] = argv;

function usage() {
  console.error(`
Usage: vp run lisca <task> <scope> [target] [-- <turbo passthrough>]

  task    dev | build | dist | deploy | typecheck | preview | install
  scope   aligner | annotator | studio | landing | workspace

Product targets (aligner, annotator, studio):
  desktop | web | demo | server | web-native | all

Dev-only targets:
  ios-install

iOS targets (macOS + Xcode):
  build ios   → prebuild + Release compile
  dist ios    → archive + development IPA (apps/<product>/mobile/release/ios/)

Landing targets:
  web | site   (aliases — both build the marketing site bundle)

Workspace targets:
  build     all | packages | webs
  dev       all (default)

Defaults:
  dev, build (product)   → desktop (Tauri stack; desktop scripts pull web + Rust)
  dev web (product)    → web + server (Vite on 876x, Rust on 976x)
  dev web-native       → Expo web + server (http://localhost:808x, API proxied to Rust on 876x)
  dev ios              → Expo native + server on LAN (HOST=0.0.0.0; set EXPO_PUBLIC_LISCA_* for iPad)
  dev ios-install      → install dev client on a USB-connected iOS device (one-time / rebuild)
  build web-native     → export Expo web bundle (apps/<product>/mobile/dist/web)
  build ios            → prebuild ios/ and compile Release (no IPA)
  dist desktop         → Tauri installers (default)
  dist ios             → development IPA under apps/<product>/mobile/release/ios/
  dev server (product) → Rust backend only
  dev, build (landing) → web
  typecheck (product)  → all packages matching @lisca/<product>-*
  preview              → web (Vite preview)

Web-native dev runs Expo in the browser (not via turbo). Open the 808x URL; API traffic is proxied to Rust on 876x.

iOS dev binds the Rust server to 0.0.0.0 and sets EXPO_PUBLIC_LISCA_HTTP_URL from your LAN IP.
Override the detected IP with EXPO_PUBLIC_LISCA_HTTP_HOST=192.168.x.x.

Examples:
  vp run lisca dev aligner
  vp run lisca dev annotator web
  vp run lisca dev aligner web-native
  vp run lisca dev aligner ios
  vp run lisca dev aligner ios-install
  vp run lisca dev landing
  vp run lisca install landing
  vp run lisca build landing
  vp run lisca build workspace all
  vp run lisca build workspace packages
  vp run lisca build workspace webs
  vp run lisca build aligner web-native
  vp run lisca build aligner ios
  vp run lisca dist aligner
  vp run lisca dist aligner ios
  vp run lisca typecheck aligner web-native
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

function renamedTargetHint(taskName, scopeName, oldName) {
  const next = "web-native";
  if (taskName === "dev" && oldName === "mobile") {
    return `vp run lisca dev ${scopeName} ${next}`;
  }
  return `vp run lisca ${taskName} ${scopeName} ${next}`;
}

function rejectRenamedTarget(taskName, scopeName, target) {
  if (!target || !RENAMED_TARGETS.has(target)) return false;
  console.error(
    `Target "${target}" was renamed. Use: ${renamedTargetHint(taskName, scopeName, target)}`,
  );
  process.exit(1);
}

function rejectDevOnlyTarget(taskName, scopeName, target) {
  if (!target || !DEV_ONLY_TARGETS.has(target) || taskName === "dev") return false;
  console.error(
    `target "${target}" only applies to dev. Example: vp run lisca dev ${scopeName} ${target}`,
  );
  process.exit(1);
}

function rejectIosTurboTarget(taskName, target) {
  if (target !== "ios") return false;
  if (taskName === "build") {
    console.error(`Use: vp run lisca build <scope> ios`);
    process.exit(1);
  }
  if (taskName === "dist") {
    console.error(`Use: vp run lisca dist <scope> ios`);
    process.exit(1);
  }
  console.error(
    `target "ios" for ${taskName} is not supported. Use: web-native | web | demo | server | desktop | all`,
  );
  process.exit(1);
}

// Turbo package suffix; workspace folder remains apps/<product>/mobile.
function turboPackageForTarget(scopeName, target) {
  if (target === "web-native") return `${scopeName}-mobile`;
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
    rejectIosTurboTarget(taskName, t);
    if (!TYPECHECK_TARGETS.has(t)) {
      console.error(
        `Invalid typecheck target "${t}". Use: web | demo | server | desktop | web-native | all`,
      );
      process.exit(1);
    }
    return [`@lisca/${turboPackageForTarget(scopeName, t)}`];
  }

  let t = target;
  if (!t) {
    if (taskName === "preview") t = "web";
    else t = "desktop";
  }

  rejectIosTurboTarget(taskName, t);

  if (!APP_TARGETS.has(t)) {
    console.error(`Invalid target "${t}". Use: desktop | web | demo | server | web-native | all`);
    process.exit(1);
  }

  if (taskName === "preview" && t !== "web" && t !== "demo") {
    console.error(
      'preview only applies to "web" or "demo" (Vite). Example: vp run lisca preview aligner demo',
    );
    process.exit(1);
  }

  return [`@lisca/${turboPackageForTarget(scopeName, t)}`];
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

function runTurbo(taskName, { filters = [], extra = turboExtra, env = {} } = {}) {
  const cmd = ["x", "turbo", "run", taskName];
  for (const filter of filters) cmd.push(`--filter=${filter}`);
  cmd.push(...extra);

  const result = spawnSync("bun", cmd, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });
  process.exit(result.status ?? 1);
}

function turboEnvFor(taskName, scopeName, target) {
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
  return spawn("bun", ["x", "turbo", "run", "dev", `--filter=@lisca/${scopeName}-server`], {
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
        "bun",
        ["x", "turbo", "run", "dev", `--filter=@lisca/${scopeName}-web`, ...turboExtra],
        {
          cwd: root,
          stdio: "inherit",
          shell: process.platform === "win32",
        },
      ).status,
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
    "node",
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

function buildMobileDeps(scopeName) {
  const build = spawnSync(
    "bun",
    ["x", "turbo", "run", "build", `--filter=@lisca/${scopeName}-mobile^...`],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (build.status !== 0) process.exit(build.status ?? 1);
}

function expoPublicLiscaEnv(host, rustPort) {
  return {
    EXPO_PUBLIC_LISCA_HTTP_URL: `http://${host}:${rustPort}`,
    EXPO_PUBLIC_LISCA_HTTP_HOST: host,
    EXPO_PUBLIC_LISCA_HTTP_PORT: String(rustPort),
  };
}

function runWebNativeDev(scopeName) {
  const mobileDir = path.join(root, "apps", scopeName, "mobile");
  const mobilePort = LISCA_MOBILE_PORTS[scopeName];
  if (!mobilePort) {
    console.error(`No mobile port configured for scope "${scopeName}".`);
    process.exit(1);
  }
  const expoPort = liscaMobileExpoPort(mobilePort);

  buildMobileDeps(scopeName);

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

  console.log(`\n[lisca] web-native UI: http://localhost:${mobilePort}\n`);

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

function runIosDev(scopeName) {
  const mobileDir = path.join(root, "apps", scopeName, "mobile");
  const rustPort = LISCA_APP_PORTS[scopeName]?.publicPort;
  if (!rustPort) {
    console.error(`No dev ports configured for scope "${scopeName}".`);
    process.exit(1);
  }
  const expoPort = liscaMobileExpoPort(LISCA_MOBILE_PORTS[scopeName]);

  buildMobileDeps(scopeName);

  const server = spawnDevServer(scopeName, { backend: false, host: "0.0.0.0" });
  const stopChildren = () => {
    if (!server.killed) server.kill("SIGTERM");
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

  const host = resolveDevLanHost();
  const liscaEnv = expoPublicLiscaEnv(host, rustPort);
  console.log(`
[lisca] iOS dev — Rust on 0.0.0.0:${rustPort}, Metro on port ${expoPort}
  API (iPad Safari test): http://${host}:${rustPort}
  EXPO_PUBLIC_LISCA_HTTP_URL=${liscaEnv.EXPO_PUBLIC_LISCA_HTTP_URL}
  First install: vp run lisca dev ${scopeName} ios-install
`);

  const status = spawnSync(
    "bun",
    ["x", "expo", "start", "--port", String(expoPort), ...turboExtra],
    {
      cwd: mobileDir,
      env: { ...process.env, ...liscaEnv, EXPO_DEV_SERVER_PORT: String(expoPort) },
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  ).status;

  stopChildren();
  process.removeListener("SIGINT", onSignal);
  process.removeListener("SIGTERM", onSignal);
  process.exit(status ?? 1);
}

function runIosInstall(scopeName) {
  const mobileDir = path.join(root, "apps", scopeName, "mobile");
  buildMobileDeps(scopeName);

  const status = spawnSync("bun", ["x", "expo", "run:ios", "--device", ...turboExtra], {
    cwd: mobileDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  }).status;

  process.exit(status ?? 1);
}

function runPackageIos(scopeName, mode) {
  const status = spawnSync(
    "bun",
    [path.join(root, "scripts/package-ios.mjs"), scopeName, mode, ...turboExtra],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  ).status;
  process.exit(status ?? 1);
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
      [path.join(root, "scripts/deploy-landing.mjs"), ...turboExtra],
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

  if (!isWorkspace(scope) && !isLanding(scope) && targetArg) {
    rejectRenamedTarget(task, scope, targetArg);
    rejectDevOnlyTarget(task, scope, targetArg);
  }

  if (task === "build" && !isWorkspace(scope) && !isLanding(scope) && targetArg === "ios") {
    runPackageIos(scope, "build");
    return;
  }

  if (task === "dist" && !isWorkspace(scope) && !isLanding(scope) && targetArg === "ios") {
    runPackageIos(scope, "dist");
    return;
  }

  if (task === "dev" && !isWorkspace(scope) && !isLanding(scope) && targetArg === "web") {
    runWebDev(scope);
    return;
  }

  if (task === "dev" && !isWorkspace(scope) && !isLanding(scope)) {
    if (targetArg === "web-native") {
      runWebNativeDev(scope);
      return;
    }
    if (targetArg === "ios") {
      runIosDev(scope);
      return;
    }
    if (targetArg === "ios-install") {
      runIosInstall(scope);
      return;
    }
  }

  const filters = filtersFor(task, scope, targetArg);
  runTurbo(task, { filters, env: turboEnvFor(task, scope, targetArg) });
}

main();
