const createMonorepoMetroConfig = require("../../../scripts/metro-monorepo.cjs");

module.exports = createMonorepoMetroConfig(__dirname, { rustPort: 8767 });
