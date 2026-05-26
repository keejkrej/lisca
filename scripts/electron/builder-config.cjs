const path = require("node:path");
const { DESKTOP_PRODUCTS } = require("./products.cjs");
const { brandDir, brandIcons } = require("./brand.cjs");

/**
 * @param {keyof typeof DESKTOP_PRODUCTS} product
 */
function createBuilderConfig(product) {
  const cfg = DESKTOP_PRODUCTS[product];
  if (!cfg) {
    throw new Error(`Unknown desktop product "${product}"`);
  }

  const codeSign = Boolean(
    process.env.CSC_LINK ||
      process.env.WIN_CSC_LINK ||
      process.env.CSC_LINK_FILE ||
      process.env.LISCA_CODE_SIGN === "1",
  );

  return {
    appId: cfg.appId,
    productName: cfg.productName,
    executableName: cfg.executableName,
    extraMetadata: {
      description: cfg.productName,
      homepage: "https://github.com/lisca/lisca",
      author: {
        name: "Lisca",
        email: "dev@lisca.local",
      },
    },
    directories: {
      output: "release",
      buildResources: brandDir,
    },
    files: ["electron/**/*", "package.json"],
    extraResources: [
      { from: "staging/web", to: "web", filter: ["**/*"] },
      { from: "staging/server", to: "server", filter: ["**/*"] },
    ],
    asar: true,
    linux: {
      target: (process.env.LISCA_LINUX_TARGETS ?? "AppImage")
        .split(",")
        .map((target) => target.trim())
        .filter(Boolean),
      category: "Science",
      maintainer: "Lisca <dev@lisca.local>",
      artifactName: "${productName}-${version}.${ext}",
      icon: brandIcons.png,
    },
    mac: {
      target: ["dmg"],
      category: "public.app-category.productivity",
      icon: brandIcons.icns,
    },
    win: {
      target: ["nsis"],
      icon: brandIcons.ico,
      // Unsigned local builds must skip rcedit/winCodeSign — extracting that bundle
      // needs symlink privileges on Windows (Developer Mode or admin).
      signAndEditExecutable: codeSign,
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
    },
  };
}

module.exports = { createBuilderConfig };
