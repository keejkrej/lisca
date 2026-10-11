#!/usr/bin/env node
/**
 * Run a TypeScript CLI that Node's --experimental-strip-types cannot load
 * (extensionless imports and dotted filenames such as assay.schema.ts).
 *
 *   node --experimental-strip-types scripts/run-jiti.ts <file.ts> [args...]
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// `jiti/lib/jiti-cli.mjs` is not an exported subpath. Resolve the package, then
// the CLI file next to it. Vite depends on jiti, so a root install provides it.
const jitiPackageJson = createRequire(require.resolve("vite/package.json")).resolve(
  "jiti/package.json",
);
const jitiCli = join(dirname(jitiPackageJson), "lib/jiti-cli.mjs");
const result = spawnSync(process.execPath, [jitiCli, ...process.argv.slice(2)], {
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
