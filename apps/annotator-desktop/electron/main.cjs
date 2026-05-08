const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const waitOn = require("wait-on");

const WEB_PORT = 5174;
const WS_PORT = 8766;
const CARGO_PACKAGE = "annotator-server";
const DEBUG_BINARY = "annotator-server";

const repoRoot = path.resolve(__dirname, "../../..");
const webUrl =
  process.env.VITE_DEV_SERVER_URL || `http://127.0.0.1:${WEB_PORT}`;

let serverChild;

function startServer() {
  const isWin = process.platform === "win32";
  const exe = isWin ? `${DEBUG_BINARY}.exe` : DEBUG_BINARY;
  const debugBin = path.join(repoRoot, "target", "debug", exe);

  if (fs.existsSync(debugBin)) {
    serverChild = spawn(debugBin, [], {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(WS_PORT) },
      stdio: "inherit",
    });
    return;
  }

  serverChild = spawn(
    "cargo",
    ["run", "-p", CARGO_PACKAGE, "--quiet"],
    {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(WS_PORT) },
      stdio: "inherit",
      shell: isWin,
    },
  );
}

async function createWindow() {
  await waitOn({
    resources: [`tcp:127.0.0.1:${WS_PORT}`],
    timeout: 120_000,
    interval: 250,
  });

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  await mainWindow.loadURL(webUrl);
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
  if (serverChild && !serverChild.killed) {
    serverChild.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverChild && !serverChild.killed) {
    serverChild.kill();
  }
});
