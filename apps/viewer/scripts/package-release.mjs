import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const appDir = process.cwd();
const workspaceRoot = path.resolve(appDir, "../..");
const targetDir = path.join(workspaceRoot, "target", "release");
const bundleDir = path.join(targetDir, "bundle", "tarball");
const tauriConfigPath = path.join(appDir, "src-tauri", "tauri.conf.json");
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf8"));
const productName = tauriConfig.productName;
const version = tauriConfig.version;
const binaryName = "viewer";

function logStep(message) {
  console.log(`\n==> ${message}`);
}

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}

function run(command, args, options = {}) {
  console.log(`$ ${formatCommand(command, args)}`);
  const result = spawnSync(command, args, {
    cwd: appDir,
    encoding: "utf8",
    ...options,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result;
}

function getArch() {
  switch (process.arch) {
    case "x64":
      return "x86_64";
    case "arm64":
      return "aarch64";
    default:
      return process.arch;
  }
}

function removeIfExists(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function runNativeTauriBundle() {
  logStep(`Packaging ${productName} ${version} for ${process.platform}/${process.arch}`);
  console.log(`App directory: ${appDir}`);
  console.log(`Release target directory: ${targetDir}`);
  console.log("Native Tauri bundle can be quiet during DMG creation on macOS.");
  console.log("If it pauses after the .app exists, it is usually in the Finder/AppleScript DMG layout step.");

  logStep("Running Tauri native bundle");
  const tauriBuild = run("bunx", [
    "@tauri-apps/cli",
    "build",
    "--config",
    "src-tauri/tauri.conf.json",
  ]);

  if ((tauriBuild.status ?? 1) === 0) {
    logStep("Tauri native bundle completed");
    console.log(`Look for artifacts under: ${path.join(targetDir, "bundle")}`);
  }

  process.exit(tauriBuild.status ?? 1);
}

function runLinuxTarballBundle() {
  const arch = getArch();
  const releaseName = `${productName}_${version}_linux_${arch}`;
  const stageDir = path.join(bundleDir, releaseName);
  const archivePath = path.join(bundleDir, `${releaseName}.tar.gz`);
  const binaryPath = path.join(targetDir, binaryName);

  logStep(`Packaging ${productName} ${version} for linux/${arch}`);
  console.log(`App directory: ${appDir}`);
  console.log(`Release target directory: ${targetDir}`);

  logStep("Building Linux binary with Tauri");
  const tauriBuild = run("bunx", [
    "@tauri-apps/cli",
    "build",
    "--no-bundle",
    "--config",
    "src-tauri/tauri.conf.json",
  ]);

  if (tauriBuild.status !== 0) {
    process.exit(tauriBuild.status ?? 1);
  }

  if (!fs.existsSync(binaryPath)) {
    console.error(`Expected binary not found: ${binaryPath}`);
    process.exit(1);
  }

  logStep("Preparing tarball staging directory");
  removeIfExists(stageDir);
  removeIfExists(archivePath);
  fs.mkdirSync(stageDir, { recursive: true });

  const packagedBinaryPath = path.join(stageDir, binaryName);
  fs.copyFileSync(binaryPath, packagedBinaryPath);
  fs.chmodSync(packagedBinaryPath, 0o755);

  const launcherPath = path.join(stageDir, "run.sh");
  fs.writeFileSync(
    launcherPath,
    `#!/bin/sh
set -eu
HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec "$HERE/${binaryName}" "$@"
`,
  );
  fs.chmodSync(launcherPath, 0o755);

  const desktopEntryPath = path.join(stageDir, "View.desktop");
  fs.writeFileSync(
    desktopEntryPath,
    `[Desktop Entry]
Type=Application
Name=${productName}
Exec=run.sh
Icon=icon
Terminal=false
Categories=Graphics;
`,
  );

  const iconSourcePath = path.join(appDir, "src-tauri", "icons", "icon.png");
  const iconTargetPath = path.join(stageDir, "icon.png");
  if (fs.existsSync(iconSourcePath)) {
    fs.copyFileSync(iconSourcePath, iconTargetPath);
  }

  const readmePath = path.join(stageDir, "README.txt");
  fs.writeFileSync(
    readmePath,
    [
      `${productName} ${version}`,
      "",
      "Contents:",
      `- ${binaryName}: release binary`,
      "- run.sh: launcher script",
      "- View.desktop: desktop entry template",
      "- icon.png: application icon",
      "",
      "Usage:",
      "1. Extract the tarball.",
      "2. Run ./run.sh or ./viewer.",
      "",
      "Notes:",
      "- This tarball is not a self-contained Linux bundle.",
      "- The target system must provide the runtime libraries required by Tauri/WebKitGTK.",
    ].join("\n"),
  );

  logStep("Creating tar.gz archive");
  const archive = run(
    "tar",
    ["-czf", archivePath, "-C", bundleDir, releaseName],
    { cwd: workspaceRoot },
  );

  if (archive.status !== 0) {
    process.exit(archive.status ?? 1);
  }

  logStep("Linux tarball completed");
  console.log(`Created tarball: ${archivePath}`);
}

if (process.platform === "linux") {
  runLinuxTarballBundle();
} else {
  runNativeTauriBundle();
}
