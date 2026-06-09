#!/usr/bin/env bun
/**
 * Thin dispatcher: maps (task, product, target?) → a single turbo --filter.
 * Avoids N×M script lines in package.json while staying explicit at the CLI.
 *
 * Usage:
 *   bun lisca <task> <product> [target] [-- <extra turbo args>]
 *
 * Examples:
 *   bun lisca dev aligner
 *   bun lisca dev aligner web
 *   bun lisca dev aligner mobile
 *   bun lisca dev aligner mobile-web
 *   bun lisca dev aligner demo
 *   bun lisca dev landing
 *   bun lisca dev landing web
 *   bun lisca dev landing site
 *   bun lisca build studio
 *   bun lisca dist aligner
 *   bun lisca typecheck annotator
 *   bun lisca typecheck annotator server
 *   bun lisca preview studio
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PRODUCTS = new Set(["aligner", "annotator", "studio", "landing"]);
const TYPECHECK_TARGETS = new Set(["desktop", "web", "demo", "server", "mobile", "all"]);
const APP_TARGETS = new Set(["desktop", "web", "demo", "server", "mobile", "mobile-web"]);
const LANDING_TARGETS = new Set(["web", "site"]);

const MOBILE_PORTS = {
  aligner: 8081,
  annotator: 8082,
  studio: 8083,
};

const dash = process.argv.indexOf("--");
const argv = dash === -1 ? process.argv.slice(2) : process.argv.slice(2, dash);
const turboExtra = dash === -1 ? [] : process.argv.slice(dash + 1);

const [task, product, targetArg] = argv;

function usage() {
  console.error(`
Usage: bun lisca <task> <product> [target] [-- <turbo passthrough>]

  task     dev | build | dist | typecheck | preview
  product  aligner | annotator | studio | landing
  target   desktop | web | demo | server | mobile | mobile-web | all | site
           (optional — sensible defaults per task)

Defaults:
  dev, build      → target desktop (Electron stack; desktop scripts pull web + Rust)
  dev, build      → target web for landing (site is an alias for the single-bundle site)
  typecheck       → target all (every package matching @lisca/<product>-*)
  preview         → target web (Vite preview)

Mobile dev runs Expo directly (not via turbo) so the CLI accepts i/a/w keys.
Use mobile-web to open the RN app in a browser for quick UI iteration.

Examples:
  bun lisca dev aligner
  bun lisca dev annotator web
  bun lisca dev aligner mobile
  bun lisca dev aligner mobile-web
  bun lisca dev aligner demo
  bun lisca dev landing web
  bun lisca dev landing site
  bun lisca build studio
  bun lisca dist aligner
  bun lisca typecheck aligner
  bun lisca typecheck aligner server
  bun lisca preview studio
`);
}

function isLanding(product) {
  return product === "landing";
}

function landingTarget(task, target) {
  const t = target ?? (task === "typecheck" ? "all" : "web");
  if (!LANDING_TARGETS.has(t) && !(task === "typecheck" && t === "all")) {
    console.error(
      `Landing only supports target web | site${task === "typecheck" ? " | all" : ""}.`,
    );
    process.exit(1);
  }
  if (t === "site") return "@lisca/landing-web";
  if (t === "all") return "@lisca/landing-*";
  return "@lisca/landing-web";
}

function filterFor(task, product, target) {
  if (isLanding(product)) {
    return landingTarget(task, target);
  }

  if (task === "typecheck") {
    const t = target ?? "all";
    if (t === "all") return `@lisca/${product}-*`;
    if (t === "mobile-web") return `@lisca/${product}-mobile`;
    if (!TYPECHECK_TARGETS.has(t)) {
      console.error(
        `Invalid typecheck target "${t}". Use: web | demo | server | desktop | mobile | all`,
      );
      process.exit(1);
    }
    return `@lisca/${product}-${t}`;
  }

  let t = target;
  if (!t) {
    if (task === "preview") t = "web";
    else t = "desktop";
  }

  if (!APP_TARGETS.has(t)) {
    console.error(`Invalid target "${t}". Use: desktop | web | demo | server | mobile | mobile-web`);
    process.exit(1);
  }

  if (task === "preview" && t !== "web" && t !== "demo") {
    console.error(
      'preview only applies to "web" or "demo" (Vite). Example: bun lisca preview aligner demo',
    );
    process.exit(1);
  }

  if (t === "mobile-web") return `@lisca/${product}-mobile`;

  return `@lisca/${product}-${t}`;
}

function runTurbo(task, { filters = [], extra = turboExtra } = {}) {
  const cmd = ["x", "turbo", "run", task];
  for (const filter of filters) cmd.push(`--filter=${filter}`);
  cmd.push(...extra);

  const result = spawnSync("bun", cmd, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  process.exit(result.status ?? 1);
}

function runMobileDev(product, { web = false } = {}) {
  const mobileDir = path.join(root, "apps", product, "mobile");
  const port = MOBILE_PORTS[product];
  if (!port) {
    console.error(`No mobile port configured for product "${product}".`);
    process.exit(1);
  }

  const build = spawnSync(
    "bun",
    ["x", "turbo", "run", "build", `--filter=@lisca/${product}-mobile^...`],
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
  if (!task || !product || argv.includes("-h") || argv.includes("--help")) {
    usage();
    process.exit(task ? 0 : 1);
  }

  if (!["dev", "build", "dist", "typecheck", "preview"].includes(task)) {
    console.error(`Unknown task "${task}". Use: dev | build | dist | typecheck | preview`);
    process.exit(1);
  }

  if (!PRODUCTS.has(product)) {
    console.error(`Unknown product "${product}". Use: aligner | annotator | studio | landing`);
    process.exit(1);
  }

  if (isLanding(product) && task === "dist") {
    console.error('dist does not apply to landing. Use: bun lisca build landing [web|site]');
    process.exit(1);
  }

  if (task === "dev" && (targetArg === "mobile" || targetArg === "mobile-web")) {
    runMobileDev(product, { web: targetArg === "mobile-web" });
    return;
  }

  const filter = filterFor(task, product, targetArg);
  runTurbo(task, { filters: [filter] });
}

main();
