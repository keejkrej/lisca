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

const PRODUCTS = new Set(["aligner", "annotator", "studio"]);
const TYPECHECK_TARGETS = new Set(["desktop", "web", "server", "mobile", "all"]);
const APP_TARGETS = new Set(["desktop", "web", "server", "mobile", "mobile-web"]);

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
  product  aligner | annotator | studio
  target   desktop | web | server | mobile | mobile-web | all
           (optional — sensible defaults per task)

Defaults:
  dev, build      → target desktop (Electron stack; desktop scripts pull web + Rust)
  typecheck       → target all (every package matching @lisca/<product>-*)
  preview         → target web (Vite preview)

Mobile dev runs Expo directly (not via turbo) so the CLI accepts i/a/w keys.
Use mobile-web to open the RN app in a browser for quick UI iteration.

Examples:
  bun lisca dev aligner
  bun lisca dev annotator web
  bun lisca dev aligner mobile
  bun lisca dev aligner mobile-web
  bun lisca build studio
  bun lisca dist aligner
  bun lisca typecheck aligner
  bun lisca typecheck aligner server
  bun lisca preview studio
`);
}

function filterFor(task, product, target) {
  if (task === "typecheck") {
    const t = target ?? "all";
    if (t === "all") return `@lisca/${product}-*`;
    if (t === "mobile-web") return `@lisca/${product}-mobile`;
    if (!TYPECHECK_TARGETS.has(t)) {
      console.error(`Invalid typecheck target "${t}". Use: web | server | desktop | mobile | all`);
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
    console.error(`Invalid target "${t}". Use: desktop | web | server | mobile | mobile-web`);
    process.exit(1);
  }

  if (task === "preview" && t !== "web") {
    console.error('preview only applies to "web" (Vite). Example: bun lisca preview aligner web');
    process.exit(1);
  }

  if (t === "mobile-web") return `@lisca/${product}-mobile`;

  return `@lisca/${product}-${t}`;
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
    console.error(`Unknown product "${product}". Use: aligner | annotator | studio`);
    process.exit(1);
  }

  if (task === "dev" && (targetArg === "mobile" || targetArg === "mobile-web")) {
    runMobileDev(product, { web: targetArg === "mobile-web" });
    return;
  }

  const filter = filterFor(task, product, targetArg);
  const cmd = ["x", "turbo", "run", task, `--filter=${filter}`, ...turboExtra];

  const result = spawnSync("bun", cmd, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  process.exit(result.status ?? 1);
}

main();
