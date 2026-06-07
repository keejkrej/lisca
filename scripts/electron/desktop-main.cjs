const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const waitOn = require("wait-on");
const { runtimeIconPath } = require("./brand.cjs");

/**
 * @param {{
 *   desktopDir: string;
 *   wsPort: number;
 *   webPort: number;
 *   serverBinary: string;
 *   cargoPackage: string;
 * }} config
 */
function runDesktopMain(config) {
  const { desktopDir, wsPort, webPort, serverBinary, cargoPackage } = config;
  const repoRoot = path.resolve(desktopDir, "../../..");
  const devServerUrl = process.env.VITE_DEV_SERVER_URL?.trim();

  /** @type {import("node:child_process").ChildProcess | undefined} */
  let serverChild;

  function serverExeName() {
    return process.platform === "win32" ? `${serverBinary}.exe` : serverBinary;
  }

  function startServer() {
    const isWin = process.platform === "win32";
    const exeName = serverExeName();
    const env = { ...process.env, PORT: String(wsPort) };
    const spawnOpts = {
      env,
      stdio: "inherit",
      cwd: app.isPackaged ? app.getPath("userData") : repoRoot,
    };

    if (app.isPackaged) {
      const bundled = path.join(process.resourcesPath, "server", exeName);
      const bundledPython =
        process.platform === "win32"
          ? path.join(process.resourcesPath, "python", "python.exe")
          : path.join(process.resourcesPath, "python", "bin", "python3");
      if (fs.existsSync(bundledPython)) {
        env.LISCA_PYTHON = bundledPython;
      }
      serverChild = spawn(bundled, [], spawnOpts);
      return;
    }

    const debugBin = path.join(repoRoot, "target", "debug", exeName);
    if (fs.existsSync(debugBin)) {
      serverChild = spawn(debugBin, [], spawnOpts);
      return;
    }

    const releaseBin = path.join(repoRoot, "target", "release", exeName);
    if (fs.existsSync(releaseBin)) {
      serverChild = spawn(releaseBin, [], spawnOpts);
      return;
    }

    serverChild = spawn("cargo", ["run", "-p", cargoPackage, "--quiet"], {
      ...spawnOpts,
      shell: isWin,
    });
  }

  function stopServer() {
    if (serverChild && !serverChild.killed) {
      serverChild.kill();
    }
  }

  async function createWindow() {
    await waitOn({
      resources: [`tcp:127.0.0.1:${wsPort}`],
      timeout: 120_000,
      interval: 250,
    });

    const windowIcon = runtimeIconPath(
      app.isPackaged ? { resourcesPath: process.resourcesPath } : {},
    );
    const mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      ...(windowIcon ? { icon: windowIcon } : {}),
      webPreferences: {
        preload: path.join(desktopDir, "electron/preload.cjs"),
        contextIsolation: true,
      },
    });

    if (devServerUrl) {
      await mainWindow.loadURL(devServerUrl);
      return;
    }

    if (app.isPackaged) {
      await mainWindow.loadFile(path.join(process.resourcesPath, "web", "index.html"));
      return;
    }

    await mainWindow.loadURL(`http://127.0.0.1:${webPort}`);
  }

  app.whenReady().then(async () => {
    startServer();
    await createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    stopServer();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    stopServer();
  });
}

module.exports = { runDesktopMain };
