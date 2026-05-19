import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

const [target, packageOutput, sourceBinary, serverBinaryName, shellBinaryName, appIconIcns] =
  process.argv.slice(2);

if (
  !target ||
  !packageOutput ||
  !sourceBinary ||
  !serverBinaryName ||
  !shellBinaryName ||
  !appIconIcns
) {
  console.error(
    "usage: node scripts/finalize-desktop-package.mjs <target> <package-output> <source-binary> <server-binary-name> <shell-binary-name> <app-icon-icns>",
  );
  process.exit(2);
}

const sidecarDestination =
  target === "macos"
    ? join(packageOutput, "Contents", "MacOS", serverBinaryName)
    : join(packageOutput, serverBinaryName);

mkdirSync(dirname(sidecarDestination), { recursive: true });
copyFileSync(sourceBinary, sidecarDestination);
chmodSync(sidecarDestination, 0o755);

const shellDestination =
  target === "macos"
    ? join(packageOutput, "Contents", "MacOS", shellBinaryName)
    : join(packageOutput, shellBinaryName);

if (!existsSync(shellDestination)) {
  console.error(`shell binary not found: ${shellDestination}`);
  process.exit(1);
}

chmodSync(shellDestination, 0o755);

if (target === "macos" && existsSync(appIconIcns)) {
  const assetsDir = dirname(appIconIcns);
  const resourcesDir = join(packageOutput, "Contents", "Resources");
  const infoPlist = join(packageOutput, "Contents", "Info.plist");
  copyFileSync(appIconIcns, join(resourcesDir, "AppIcon.icns"));
  const iconIcoSource = join(assetsDir, "icon.ico");
  const iconPngSource = join(assetsDir, "icon.png");
  if (existsSync(iconIcoSource)) copyFileSync(iconIcoSource, join(resourcesDir, "icon.ico"));
  if (existsSync(iconPngSource)) copyFileSync(iconPngSource, join(resourcesDir, "icon.png"));
  if (existsSync(infoPlist)) {
    execSync(`plutil -replace CFBundleIconFile -string AppIcon "${infoPlist}"`, { stdio: "inherit" });
  }
}
