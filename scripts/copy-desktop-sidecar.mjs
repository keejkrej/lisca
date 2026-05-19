import { chmodSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const [target, packageOutput, sourceBinary, serverBinaryName] = process.argv.slice(2);

if (!target || !packageOutput || !sourceBinary || !serverBinaryName) {
  console.error(
    "usage: node scripts/copy-desktop-sidecar.mjs <target> <package-output> <source-binary> <server-binary-name>",
  );
  process.exit(2);
}

const destination =
  target === "macos"
    ? join(packageOutput, "Contents", "MacOS", serverBinaryName)
    : join(packageOutput, serverBinaryName);

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(sourceBinary, destination);
chmodSync(destination, 0o755);
