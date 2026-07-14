import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflowShells = [
  ["/assay", "../src/routes/assay.tsx"],
  ["/info", "../src/routes/info.tsx"],
  ["/align", "../src/routes/align.tsx"],
  ["/annotate", "../src/routes/annotate.tsx"],
  ["/result", "../src/result/result-page.tsx"],
] as const;

describe("Studio workflow route composition", () => {
  it.each(workflowShells)("includes StudioLeft on %s", (_route, sourcePath) => {
    const source = readFileSync(new URL(sourcePath, import.meta.url), "utf8");

    expect(source).toMatch(/<StudioLeft\s*\/>/);
  });
});
