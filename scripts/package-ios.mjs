#!/usr/bin/env bun
/**
 * Prebuild and compile/archive LiSCA Expo iOS apps.
 *
 * Usage:
 *   bun scripts/package-ios.mjs aligner build
 *   bun scripts/package-ios.mjs aligner dist
 *   bun lisca build aligner ios
 *   bun lisca dist aligner ios
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS = new Set(["aligner", "annotator", "studio"]);

function usage() {
  console.error(`
Usage: bun scripts/package-ios.mjs <product> <build|dist>

  product  aligner | annotator | studio
  build    prebuild ios/ and compile a Release device build (no IPA)
  dist     archive + export a development IPA (requires Xcode signing)

Examples:
  bun scripts/package-ios.mjs aligner build
  bun scripts/package-ios.mjs aligner dist
`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function mobileDir(product) {
  return path.join(root, "apps", product, "mobile");
}

function buildMobileDeps(product) {
  run("vp", ["run", "--no-cache", "--filter", `@lisca/${product}-mobile^...`, "build"], {
    cwd: root,
  });
}

function ensurePrebuild(product, { clean = false } = {}) {
  const dir = mobileDir(product);
  const args = ["x", "expo", "prebuild", "--platform", "ios"];
  if (clean) args.push("--clean");
  run("bun", args, { cwd: dir });
}

function findIosWorkspace(iosDir) {
  const name = fs.readdirSync(iosDir).find((entry) => entry.endsWith(".xcworkspace"));
  if (!name) {
    console.error(`No .xcworkspace under ${iosDir}. Run prebuild first.`);
    process.exit(1);
  }
  return path.join(iosDir, name);
}

function findIosScheme(workspace) {
  const result = spawnSync("xcodebuild", ["-workspace", workspace, "-list", "-json"], {
    encoding: "utf8",
  });
  if (result.status !== 0 || !result.stdout?.trim()) {
    console.error("xcodebuild -list failed. Is Xcode installed?");
    process.exit(result.status ?? 1);
  }
  const schemes = JSON.parse(result.stdout).workspace?.schemes ?? [];
  if (schemes.length === 0) {
    console.error(`No schemes found for workspace ${workspace}`);
    process.exit(1);
  }
  const appScheme = schemes.find((scheme) => !scheme.startsWith("Pods-")) ?? schemes[0];
  return appScheme;
}

function iosReleaseDir(product) {
  return path.join(mobileDir(product), "release", "ios");
}

function runBuild(product) {
  if (process.platform !== "darwin") {
    console.error("iOS builds require macOS with Xcode.");
    process.exit(1);
  }

  console.log(`[lisca] building ${product} iOS (Release compile)…`);
  buildMobileDeps(product);
  ensurePrebuild(product);

  const iosDir = path.join(mobileDir(product), "ios");
  const workspace = findIosWorkspace(iosDir);
  const scheme = findIosScheme(workspace);

  run("xcodebuild", [
    "-workspace",
    workspace,
    "-scheme",
    scheme,
    "-configuration",
    "Release",
    "-destination",
    "generic/platform=iOS",
    "build",
    "CODE_SIGNING_ALLOWED=NO",
  ]);

  console.log(`\n[lisca] iOS Release build succeeded (${scheme}).`);
}

function writeExportOptionsPlist(dest) {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>development</string>
</dict>
</plist>
`;
  fs.writeFileSync(dest, plist);
}

function runDist(product) {
  if (process.platform !== "darwin") {
    console.error("iOS distribution requires macOS with Xcode.");
    process.exit(1);
  }

  console.log(`[lisca] packaging ${product} iOS IPA (development export)…`);
  buildMobileDeps(product);
  ensurePrebuild(product, { clean: true });

  const iosDir = path.join(mobileDir(product), "ios");
  const workspace = findIosWorkspace(iosDir);
  const scheme = findIosScheme(workspace);
  const outDir = iosReleaseDir(product);
  const archivePath = path.join(outDir, `${scheme}.xcarchive`);
  const exportOptions = path.join(outDir, "ExportOptions.plist");

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  writeExportOptionsPlist(exportOptions);

  run("xcodebuild", [
    "-workspace",
    workspace,
    "-scheme",
    scheme,
    "-configuration",
    "Release",
    "-destination",
    "generic/platform=iOS",
    "-archivePath",
    archivePath,
    "archive",
  ]);

  run("xcodebuild", [
    "-exportArchive",
    "-archivePath",
    archivePath,
    "-exportPath",
    outDir,
    "-exportOptionsPlist",
    exportOptions,
  ]);

  console.log(`\n[lisca] IPA written to ${outDir}`);
}

function main() {
  const [product, mode] = process.argv.slice(2);
  if (!product || !mode || product === "-h" || product === "--help") {
    usage();
    process.exit(product ? 0 : 1);
  }

  if (!PRODUCTS.has(product)) {
    console.error(`Unknown product "${product}". Use: aligner | annotator | studio`);
    process.exit(1);
  }

  if (mode === "build") {
    runBuild(product);
    return;
  }
  if (mode === "dist") {
    runDist(product);
    return;
  }

  console.error(`Unknown mode "${mode}". Use: build | dist`);
  process.exit(1);
}

main();
