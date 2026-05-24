const path = require("node:path");

const brandDir = path.resolve(__dirname, "../../assets/brand");

const brandIcons = {
  png: path.join(brandDir, "icon.png"),
  ico: path.join(brandDir, "icon.ico"),
  icns: path.join(brandDir, "AppIcon.icns"),
};

/** @returns {string | undefined} */
function runtimeIconPath() {
  if (process.platform === "win32") {
    return brandIcons.ico;
  }
  if (process.platform === "darwin") {
    return brandIcons.icns;
  }
  return brandIcons.png;
}

module.exports = { brandDir, brandIcons, runtimeIconPath };
