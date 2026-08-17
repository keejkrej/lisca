import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflowShells = [
  ["/assay", "../src/routes/assay.tsx"],
  ["/info", "../src/routes/info.tsx"],
  ["/align", "../src/routes/align.tsx"],
  ["/annotate", "../src/routes/annotate.tsx"],
  ["/result", "../src/result/result-page.tsx"],
] as const;

function readSource(sourcePath: string): string {
  return readFileSync(new URL(sourcePath, import.meta.url), "utf8");
}

describe("Studio workflow route composition", () => {
  it.each(workflowShells)("uses the stage shell on %s", (_route, sourcePath) => {
    const source = readSource(sourcePath);

    expect(source).toMatch(/<AppShell variant="stage">/);
    expect(source).toMatch(/<StudioLeft\s*\/>/);
    expect(source).toMatch(/<AppShell\.TopBar>/);
    expect(source).toMatch(/<StudioTopBar(?:\s+showExpert)?\s*\/>/);
    expect(source.match(/widthClass="w-64"/g)).toHaveLength(2);
    expect(source).not.toMatch(/<AppShell\.Dock>/);
    expect(source.indexOf("<AppShell.TopBar>")).toBeLessThan(source.indexOf("<AppShell.Main>"));
  });

  it.each([
    ["/align", "../src/routes/align.tsx"],
    ["/annotate", "../src/routes/annotate.tsx"],
    ["/result", "../src/result/result-page.tsx"],
  ])("puts the expert toggle in the top bar on %s", (_route, sourcePath) => {
    const source = readSource(sourcePath);

    expect(source).toMatch(/<StudioTopBar\s+showExpert\s*\/>/);
  });

  it("uses the Info label and one picker-field treatment for source and workspace", () => {
    const navSource = readSource("../src/components/studio-nav-rail.tsx");
    const infoSource = readSource("../src/components/basic-info-step1.tsx");

    expect(navSource).toMatch(/>\s*Info\s*</);
    expect(navSource).not.toMatch(/Basic info/);
    expect(infoSource).toMatch(/>Info<\/h1>/);
    expect(infoSource.match(/<PathPickerField/g)).toHaveLength(2);
    expect(infoSource).not.toMatch(/Basic info/);
  });

  it("keeps document scrolling on the full main sheet instead of constrained content", () => {
    const assayRouteSource = readSource("../src/routes/assay.tsx");
    const infoRouteSource = readSource("../src/routes/info.tsx");
    const samplesSource = readSource("../src/components/basic-info-step2.tsx");
    const resultPageSource = readSource("../src/result/result-page.tsx");
    const resultGallerySource = readSource("../src/result/result-panels-grid.tsx");
    const analysisDemoSource = readSource("../../demo/src/analysis-demo.tsx");

    expect(assayRouteSource).toMatch(/<AppShell\.MainScroll/);
    expect(infoRouteSource).toMatch(/<AppShell\.MainScroll/);
    expect(samplesSource).not.toMatch(/overflow-y-auto/);
    expect(samplesSource).not.toMatch(/max-h-\[58vh\]/);
    expect(resultPageSource).toMatch(/<AppShell\.MainScroll/);
    expect(resultGallerySource).not.toMatch(/overflow-y-auto/);
    expect(analysisDemoSource.match(/<AppShell\.MainScroll/g)).toHaveLength(2);
  });

  it("reuses the standalone annotation rail and shared five-action tool grid", () => {
    const stackSource = readSource("../src/components/studio-annotate-instrument-stack.tsx");

    expect(stackSource).toMatch(/<AnnotationControlRail\b/);
    expect(stackSource).not.toMatch(/title="Label"/);
    expect(stackSource).toMatch(/<AnnotationToolGrid/);
    expect(stackSource).toMatch(/layout="rail"/);
    expect(stackSource).toMatch(/shortcutsEnabled=\{dock\.shortcutsEnabled\}/);
  });
});
