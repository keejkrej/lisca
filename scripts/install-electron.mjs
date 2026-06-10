import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function installElectronPackage(packageJsonPath) {
  const packageDir = path.dirname(packageJsonPath);
  const pathFile = path.join(packageDir, "path.txt");
  const installScript = path.join(packageDir, "install.js");

  if (existsSync(pathFile) || !existsSync(installScript)) {
    return;
  }

  console.log(`Downloading Electron binary (${path.basename(packageDir)})...`);
  execSync(`node "${installScript}"`, { stdio: "inherit" });
}

if (process.env.CI || process.env.RENDER || process.env.LISCA_SKIP_ELECTRON) {
  process.exit(0);
}

try {
  installElectronPackage(require.resolve("electron/package.json"));
} catch {
  // Electron is only required for desktop apps.
}
