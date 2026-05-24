const path = require("node:path");
const { runDesktopMain } = require("../../../scripts/electron/desktop-main.cjs");

runDesktopMain({
  desktopDir: path.join(__dirname, ".."),
  wsPort: 8765,
  webPort: 5173,
  serverBinary: "aligner-server",
  cargoPackage: "aligner-server",
});
