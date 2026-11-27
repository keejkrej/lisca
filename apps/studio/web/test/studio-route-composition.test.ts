import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const workflowShells = [
  ["/onboarding", "../src/routes/onboarding.ts"],
  ["/help-us", "../src/routes/help-us.ts"],
  ["/assay", "../src/routes/assay.ts"],
  ["/metadata", "../src/routes/metadata.ts"],
  ["/align", "../src/routes/align.ts"],
  ["/annotate", "../src/routes/annotate.ts"],
  ["/analysis", "../src/analysis/analysis-page.ts"],
] as const;

function readSource(sourcePath: string): string {
  return readFileSync(new URL(sourcePath, import.meta.url), "utf8");
}

describe("Studio workflow route composition", () => {
  it.each(workflowShells)("uses the stage shell on %s", (_route, sourcePath) => {
    const source = readSource(sourcePath);

    expect(source).toMatch(/\bAppShell\(h,/);
    expect(source).not.toMatch(/variant:\s*"stage"/);
    expect(source).not.toMatch(/AppShell\.Header/);
    expect(source).toMatch(/\bStudioLeft\(h/);
    expect(source).toMatch(/\btopBar:\s*StudioTopBar\(h/);
    expect(source.match(/(?:left|right)WidthClass:\s*"w-rail"/g)).toHaveLength(2);
    expect(source).not.toMatch(/\bAppShell\.Dock\b|\bdock:/);
    expect(source.indexOf("topBar:")).toBeLessThan(source.indexOf("main:"));
  });

  it.each([
    ["/align", "../src/routes/align.ts"],
    ["/annotate", "../src/routes/annotate.ts"],
    ["/analysis", "../src/analysis/analysis-page.ts"],
  ])("puts the expert toggle in the top bar on %s", (_route, sourcePath) => {
    const source = readSource(sourcePath);

    expect(source).toMatch(/StudioTopBar\([^)]*showExpert:\s*true/);
  });

  it("keeps label-free reference setup out of Analysis", () => {
    const source = readSource("../src/analysis/analysis-page.ts");

    expect(source).not.toMatch(/label-free-references|LabelFreeReferences/);
    expect(source).toMatch(/saveLabel:\s*"Save PDF"/);
  });

  it("uses the Metadata label and one picker-field treatment for source and workspace", () => {
    const navSource = readSource("../src/components/studio-nav-rail.ts");
    const pagesSource = readSource("../src/navigation/studio-page-shortcuts.ts");
    const metadataSource = readSource("../src/components/metadata-fields.ts");
    const metadataRouteSource = readSource("../src/routes/metadata.ts");
    const samplesSource = readSource("../src/components/metadata-samples.ts");

    expect(pagesSource).toMatch(/label: "Metadata"/);
    expect(pagesSource).toMatch(/label: "Analysis"/);
    expect(navSource).toMatch(/STUDIO_PAGES/);
    expect(metadataRouteSource).toMatch(/\bMetadataFields\(h/);
    expect(metadataRouteSource).toMatch(/\bMetadataSamples\(h/);
    expect(metadataRouteSource).not.toMatch(/infoStep/);
    expect(navSource).not.toMatch(/Basic info/);
    expect(metadataSource).toMatch(/\.h1[\s\S]*?\.children\("Info"\)/);
    expect(metadataSource.match(/\bSourcePickerField\(h,/g)).toHaveLength(1);
    expect(metadataSource.match(/\bPathPickerField\(h,/g)).toHaveLength(1);
    expect(metadataSource).not.toMatch(/SourcePickerModal/);
    expect(metadataSource).not.toMatch(/Basic info/);
    expect(samplesSource).toMatch(/max-w-\[640px\]/);
    expect(samplesSource).not.toMatch(/border-b/);
    expect(samplesSource).not.toMatch(/border-y/);
  });

  it("keeps document scrolling on the full main sheet instead of constrained content", () => {
    const assayRouteSource = readSource("../src/routes/assay.ts");
    const metadataRouteSource = readSource("../src/routes/metadata.ts");
    const samplesSource = readSource("../src/components/metadata-samples.ts");
    const analysisPageSource = readSource("../src/analysis/analysis-page.ts");
    const analysisGallerySource = readSource("../src/analysis/analysis-plot-gallery.ts");

    expect(assayRouteSource).toMatch(/AppShell\.MainScroll\(/);
    expect(metadataRouteSource).toMatch(/AppShell\.MainScroll\(/);
    expect(samplesSource).not.toMatch(/overflow-y-auto/);
    expect(samplesSource).not.toMatch(/max-h-\[58vh\]/);
    expect(analysisPageSource).toMatch(/AppShell\.MainScroll\(/);
    expect(analysisGallerySource).not.toMatch(/overflow-y-auto/);
  });

  it("reuses the standalone annotation rail and shared five-action tool grid", () => {
    const stackSource = readSource("../src/components/studio-annotate-instrument-stack.ts");

    expect(stackSource).toMatch(/\bAnnotationControlRail\(h,/);
    expect(stackSource).not.toMatch(/title:\s*"Label"/);
    expect(stackSource).toMatch(/\bAnnotationToolGrid\(h,/);
    expect(stackSource).toMatch(/layout:\s*"rail"/);
    expect(stackSource).toMatch(/shortcutsEnabled:\s*dock\.shortcutsEnabled/);
  });
});

describe("Studio startup", () => {
  it("starts on the Assay page without the resume-session picker", () => {
    const gateSource = readSource("../src/components/studio-work-session-gate.ts");
    const rootSource = readSource("../src/routes/__root.ts");

    expect(gateSource).not.toMatch(/WorkSessionPickerDialog|createWorkSessionGate/);
    expect(rootSource).toMatch(/StudioRoute\.Assay\(\)/);
  });
});
