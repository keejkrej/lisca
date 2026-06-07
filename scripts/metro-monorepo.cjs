const path = require("node:path");
const { createRequire } = require("node:module");

module.exports = function createMonorepoMetroConfig(projectRoot) {
  const requireFromProject = createRequire(path.join(projectRoot, "package.json"));
  const { getDefaultConfig } = requireFromProject("expo/metro-config");
  const config = getDefaultConfig(projectRoot);
  const workspaceRoot = path.resolve(projectRoot, "../../..");

  config.watchFolders = [workspaceRoot];
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ];

  return config;
};
