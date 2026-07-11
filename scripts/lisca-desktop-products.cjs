/** @typedef {typeof DESKTOP_PRODUCTS[keyof typeof DESKTOP_PRODUCTS]} DesktopProductConfig */

const { LISCA_APP_PORTS } = require("./lisca-dev-ports.cjs");

const DESKTOP_PRODUCTS = {
  aligner: {
    webPkg: "@lisca/aligner-web",
    serverPkg: "@lisca/aligner-server",
    port: LISCA_APP_PORTS.aligner.publicPort,
    backendPort: LISCA_APP_PORTS.aligner.backendPort,
    serverBinary: "aligner-server",
    cargoPackage: "aligner-server",
    appId: "com.lisca.aligner",
    productName: "Lisca Aligner",
    executableName: "lisca-aligner",
  },
  annotator: {
    webPkg: "@lisca/annotator-web",
    serverPkg: "@lisca/annotator-server",
    port: LISCA_APP_PORTS.annotator.publicPort,
    backendPort: LISCA_APP_PORTS.annotator.backendPort,
    serverBinary: "annotator-server",
    cargoPackage: "annotator-server",
    appId: "com.lisca.annotator",
    productName: "Lisca Annotator",
    executableName: "lisca-annotator",
  },
  studio: {
    webPkg: "@lisca/studio-web",
    serverPkg: "@lisca/studio-server",
    port: LISCA_APP_PORTS.studio.publicPort,
    backendPort: LISCA_APP_PORTS.studio.backendPort,
    serverBinary: "studio-server",
    cargoPackage: "studio-server",
    appId: "com.lisca.studio",
    productName: "Lisca Studio",
    executableName: "lisca-studio",
  },
};

module.exports = { DESKTOP_PRODUCTS };