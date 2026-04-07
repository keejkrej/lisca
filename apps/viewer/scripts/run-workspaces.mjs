import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [, , scriptName, ...rest] = process.argv;

if (!scriptName) {
  console.error("Usage: bun run scripts/run-workspaces.mjs <script> [--scope packages|apps]");
  process.exit(1);
}

let scope = "packages";
for (let index = 0; index < rest.length; index += 1) {
  if (rest[index] === "--scope") {
    scope = rest[index + 1] ?? scope;
  }
}

const rootDir = process.cwd();
const parentDir = path.join(rootDir, scope);

const workspaceDirs = readdirSync(parentDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(parentDir, entry.name))
  .filter((dir) => {
    try {
      const manifest = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
      return Boolean(manifest.scripts?.[scriptName]);
    } catch {
      return false;
    }
  })
  .sort();

for (const dir of workspaceDirs) {
  const result = spawnSync("bun", ["run", "--cwd", dir, scriptName], {
    cwd: rootDir,
    stdio: "inherit",
  });

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}
