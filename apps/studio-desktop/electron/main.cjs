const path = require("node:path");
const { runDesktopMain } = require("../../../scripts/electron/desktop-main.cjs");

runDesktopMain({
  desktopDir: path.join(__dirname, ".."),
  wsPort: 8767,
  webPort: 5175,
  serverBinary: "studio-server",
  cargoPackage: "studio-server",
});
