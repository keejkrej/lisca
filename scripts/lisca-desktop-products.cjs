/** @typedef {typeof DESKTOP_PRODUCTS[keyof typeof DESKTOP_PRODUCTS]} DesktopProductConfig */

const { LISCA_APP_PORTS } = require("./lisca-dev-ports.cjs");

const DESKTOP_PRODUCTS = {
  aligner: {
    webPkg: "@lisca/aligner-web",
    port: LISCA_APP_PORTS.aligner.publicPort,
    backendPort: LISCA_APP_PORTS.aligner.backendPort,
    appId: "com.lisca.aligner",
    productName: "Lisca Aligner",
    executableName: "lisca-aligner",
  },
  annotator: {
    webPkg: "@lisca/annotator-web",
    port: LISCA_APP_PORTS.annotator.publicPort,
    backendPort: LISCA_APP_PORTS.annotator.backendPort,
    appId: "com.lisca.annotator",
    productName: "Lisca Annotator",
    executableName: "lisca-annotator",
  },
  studio: {
    webPkg: "@lisca/studio-web",
    port: LISCA_APP_PORTS.studio.publicPort,
    backendPort: LISCA_APP_PORTS.studio.backendPort,
    appId: "com.lisca.studio",
    productName: "Lisca Studio",
    executableName: "lisca-studio",
  },
};

module.exports = { DESKTOP_PRODUCTS };
