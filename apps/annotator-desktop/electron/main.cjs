const path = require("node:path");
const { runDesktopMain } = require("../../../scripts/electron/desktop-main.cjs");

runDesktopMain({
  desktopDir: path.join(__dirname, ".."),
  wsPort: 8766,
  webPort: 5174,
  serverBinary: "annotator-server",
  cargoPackage: "annotator-server",
});
