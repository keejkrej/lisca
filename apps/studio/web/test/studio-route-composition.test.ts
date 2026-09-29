import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const workflowShells = [
  ["/assay", "../src/routes/assay.tsx"],
  ["/metadata", "../src/routes/metadata.tsx"],
  ["/align", "../src/routes/align.tsx"],
  ["/annotate", "../src/routes/annotate.tsx"],
  ["/analysis", "../src/analysis/analysis-page.tsx"],
] as const;

function readSource(sourcePath: string): string {
  return readFileSync(new URL(sourcePath, import.meta.url), "utf8");
}

describe("Studio workflow route composition", () => {
  it.each(workflowShells)("uses the stage shell on %s", (_route, sourcePath) => {
    const source = readSource(sourcePath);

    expect(source).toMatch(/<AppShell>/);
    expect(source).not.toMatch(/variant="stage"/);
    expect(source).not.toMatch(/<AppShell\.Header>/);
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
    ["/analysis", "../src/analysis/analysis-page.tsx"],
  ])("puts the expert toggle in the top bar on %s", (_route, sourcePath) => {
    const source = readSource(sourcePath);

    expect(source).toMatch(/<StudioTopBar\s+showExpert\s*\/>/);
  });

  it("uses the Metadata label and one picker-field treatment for source and workspace", () => {
    const navSource = readSource("../src/components/studio-nav-rail.tsx");
    const pagesSource = readSource("../src/navigation/studio-page-shortcuts.ts");
    const metadataSource = readSource("../src/components/metadata-fields.tsx");
    const metadataRouteSource = readSource("../src/routes/metadata.tsx");
    const samplesSource = readSource("../src/components/metadata-samples.tsx");

    expect(pagesSource).toMatch(/label: "Metadata"/);
    expect(pagesSource).toMatch(/label: "Analysis"/);
    expect(navSource).toMatch(/STUDIO_PAGES/);
    expect(metadataRouteSource).toMatch(/<MetadataFields/);
    expect(metadataRouteSource).toMatch(/<MetadataSamples/);
    expect(metadataRouteSource).not.toMatch(/infoStep/);
    expect(navSource).not.toMatch(/Basic info/);
    expect(metadataSource).toMatch(/>Info<\/h1>/);
    expect(metadataSource.match(/<PathPickerField/g)).toHaveLength(2);
    expect(metadataSource).not.toMatch(/Basic info/);
    expect(samplesSource).not.toMatch(/border-b/);
    expect(samplesSource).not.toMatch(/border-y/);
  });

  it("keeps document scrolling on the full main sheet instead of constrained content", () => {
    const assayRouteSource = readSource("../src/routes/assay.tsx");
    const metadataRouteSource = readSource("../src/routes/metadata.tsx");
    const samplesSource = readSource("../src/components/metadata-samples.tsx");
    const analysisPageSource = readSource("../src/analysis/analysis-page.tsx");
    const analysisGallerySource = readSource("../src/analysis/analysis-plot-gallery.tsx");
    const analysisDemoSource = readSource("../../demo/src/analysis-demo.tsx");

    expect(assayRouteSource).toMatch(/<AppShell\.MainScroll/);
    expect(metadataRouteSource).toMatch(/<AppShell\.MainScroll/);
    expect(samplesSource).not.toMatch(/overflow-y-auto/);
    expect(samplesSource).not.toMatch(/max-h-\[58vh\]/);
    expect(analysisPageSource).toMatch(/<AppShell\.MainScroll/);
    expect(analysisGallerySource).not.toMatch(/overflow-y-auto/);
    expect(analysisDemoSource).toMatch(/<DemoShell>/);
    expect(analysisDemoSource).not.toMatch(/<AppShell/);
    expect(analysisDemoSource.match(/<DemoShell\.MainScroll/g)).toHaveLength(2);
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
