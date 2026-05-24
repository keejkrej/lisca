/** @typedef {typeof DESKTOP_PRODUCTS[keyof typeof DESKTOP_PRODUCTS]} DesktopProductConfig */

const DESKTOP_PRODUCTS = {
  aligner: {
    webPkg: "@lisca/aligner-web",
    serverPkg: "@lisca/aligner-server",
    webPort: 5173,
    wsPort: 8765,
    serverBinary: "aligner-server",
    cargoPackage: "aligner-server",
    appId: "com.lisca.aligner",
    productName: "Lisca Aligner",
    executableName: "lisca-aligner",
  },
  annotator: {
    webPkg: "@lisca/annotator-web",
    serverPkg: "@lisca/annotator-server",
    webPort: 5174,
    wsPort: 8766,
    serverBinary: "annotator-server",
    cargoPackage: "annotator-server",
    appId: "com.lisca.annotator",
    productName: "Lisca Annotator",
    executableName: "lisca-annotator",
  },
  studio: {
    webPkg: "@lisca/studio-web",
    serverPkg: "@lisca/studio-server",
    webPort: 5175,
    wsPort: 8767,
    serverBinary: "studio-server",
    cargoPackage: "studio-server",
    appId: "com.lisca.studio",
    productName: "Lisca Studio",
    executableName: "lisca-studio",
  },
};

module.exports = { DESKTOP_PRODUCTS };
