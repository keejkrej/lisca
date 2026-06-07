const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("liscaDesktop", {
  product: "studio",
});
