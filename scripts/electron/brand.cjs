const path = require("node:path");
const fs = require("node:fs");

const brandCandidates = [
  path.resolve(__dirname, "../../assets/brand"),
  path.resolve(__dirname, "../../../assets/brand"),
];

const brandDir =
  brandCandidates.find((dir) => fs.existsSync(path.join(dir, "icon.png"))) ?? brandCandidates[0];

const brandIcons = {
  png: path.join(brandDir, "icon.png"),
  ico: path.join(brandDir, "icon.ico"),
  icns: path.join(brandDir, "AppIcon.icns"),
};

/** @returns {string | undefined} */
function runtimeIconPath(options = {}) {
  const { resourcesPath } = options;
  if (resourcesPath) {
    const bundledName =
      process.platform === "win32" ? "icon.ico" : process.platform === "darwin" ? "AppIcon.icns" : "icon.png";
    const bundled = path.join(resourcesPath, "brand", bundledName);
    if (fs.existsSync(bundled)) {
      return bundled;
    }
  }

  if (process.platform === "win32") {
    return fs.existsSync(brandIcons.ico) ? brandIcons.ico : undefined;
  }
  if (process.platform === "darwin") {
    return fs.existsSync(brandIcons.icns) ? brandIcons.icns : undefined;
  }
  return fs.existsSync(brandIcons.png) ? brandIcons.png : undefined;
}

module.exports = { brandDir, brandIcons, runtimeIconPath };
