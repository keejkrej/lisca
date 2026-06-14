import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function installSkiaLibs(packageJsonPath) {
  const packageDir = path.dirname(packageJsonPath);
  const iosLibs = path.join(packageDir, "libs", "ios");
  const installScript = path.join(packageDir, "scripts", "install-libs.js");

  if (existsSync(iosLibs) || !existsSync(installScript)) {
    return;
  }

  console.log("Installing react-native-skia native binaries...");
  execSync(`node "${installScript}"`, { stdio: "inherit" });
}

try {
  installSkiaLibs(require.resolve("@shopify/react-native-skia/package.json"));
} catch {
  // react-native-skia is only required for mobile apps.
}
