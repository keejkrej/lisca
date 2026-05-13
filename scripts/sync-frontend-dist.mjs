import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

const [source, destination] = process.argv.slice(2);

if (!source || !destination) {
  console.error("usage: node scripts/sync-frontend-dist.mjs <source> <destination>");
  process.exit(2);
}

rmSync(destination, { force: true, recursive: true });
mkdirSync(dirname(destination), { recursive: true });
cpSync(source, destination, { recursive: true });
