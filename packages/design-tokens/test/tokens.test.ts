import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vite-plus/test";

import { renderVariablesCss } from "../src/render-css";
import { tokens } from "../src/tokens";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");

describe("design tokens", () => {
  it("matches the generated stylesheet", () => {
    const generated = readFileSync(resolve(packageRoot, "generated/variables.css"), "utf8");
    expect(generated).toBe(renderVariablesCss());
  });

  it("keeps runtime brand fills on the icon hex in both schemes", () => {
    const css = renderVariablesCss();
    expect(css).toContain(`--lisca-brand: ${tokens.brand.studio};`);
    expect(css).toContain(`--lisca-brand: ${tokens.brand.aligner};`);
    expect(css).toContain(`--lisca-brand: ${tokens.brand.annotator};`);
    expect(css).not.toContain(tokens.brandOnWhite.studio);
    expect(css).not.toContain(tokens.brandOnWhite.aligner);
    expect(css).not.toContain(tokens.brandOnWhite.annotator);
    expect(css).not.toContain('.dark[data-lisca-app="studio"]');
  });

  it("does not repeat semantic color assignments in the UI theme", () => {
    const theme = readFileSync(resolve(repoRoot, "packages/ui/theme.css"), "utf8");
    expect(theme).toContain('@import "@lisca/design-tokens/variables.css"');
    expect(theme).not.toMatch(/--background\s*:/);
    expect(theme).not.toMatch(/--lisca-brand\s*:/);
    expect(theme).not.toMatch(/--instrument-gfp\s*:/);
    expect(theme).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
