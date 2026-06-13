const http = require("node:http");
const path = require("node:path");
const { createRequire } = require("node:module");
const { withNativeWind } = require("nativewind/metro");
const { isLiscaApiProxyPath } = require("./lisca-dev-proxy-shared.cjs");

function pipeHttp(req, res, port) {
  const headers = { ...req.headers, host: `127.0.0.1:${port}` };
  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain" });
    }
    res.end("Bad Gateway");
  });
  req.pipe(proxyReq);
}

function createRustApiProxyMiddleware(rustPort) {
  return (req, res, next) => {
    if (!isLiscaApiProxyPath(req.url ?? "/")) {
      next();
      return;
    }
    pipeHttp(req, res, rustPort);
  };
}

module.exports = function createMonorepoMetroConfig(projectRoot, options = {}) {
  const requireFromProject = createRequire(path.join(projectRoot, "package.json"));
  const { getDefaultConfig } = requireFromProject("expo/metro-config");
  const config = getDefaultConfig(projectRoot);
  const workspaceRoot = path.resolve(projectRoot, "../../..");

  config.watchFolders = [workspaceRoot];
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ];

  const rustPort = Number(options.rustPort ?? process.env.LISCA_DEV_RUST_PORT);
  if (rustPort > 0) {
    const proxy = createRustApiProxyMiddleware(rustPort);
    const previousEnhance = config.server?.enhanceMiddleware;
    config.server = {
      ...config.server,
      enhanceMiddleware: (middleware, metroServer) => {
        const inner = previousEnhance ? previousEnhance(middleware, metroServer) : middleware;
        return (req, res, next) => {
          proxy(req, res, () => inner(req, res, next));
        };
      },
    };
  }

  const nativeWindCss =
    options.nativeWindCss ?? path.resolve(workspaceRoot, "packages/ui-native/global.css");

  return withNativeWind(config, { input: nativeWindCss, inlineRem: 16 });
};
