import { readFileSync, writeFileSync } from "node:fs";
const urls = JSON.parse(readFileSync("packages/analysis/src/fixtures/png/data-urls.json", "utf8"));
const lines = [
  "/** Tiny solid-color PNGs matching Rust result filenames. Sample data only. */",
  "export const FIXTURE_PNG_DATA_URLS = {",
];
for (const [name, url] of Object.entries(urls)) {
  lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(url)},`);
}
lines.push("} as const;");
lines.push("");
writeFileSync("packages/analysis/src/fixtures/png-data.ts", lines.join("\n"));
console.log("wrote png-data.ts", Object.keys(urls).length);
