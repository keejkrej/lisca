const path = require("node:path");
const fs = require("node:fs");

function loadDesktopMain() {
  const packaged = path.join(__dirname, "desktop-main.cjs");
  if (fs.existsSync(packaged)) {
    return require(packaged);
  }
  return require(path.join(__dirname, "../../../../scripts/electron/desktop-main.cjs"));
}

const { runDesktopMain } = loadDesktopMain();

runDesktopMain({
  desktopDir: path.join(__dirname, ".."),
  wsPort: 8766,
  webPort: 5174,
  serverBinary: "annotator-server",
  cargoPackage: "annotator-server",
});
