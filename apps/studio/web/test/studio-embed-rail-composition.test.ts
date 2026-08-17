import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(sourcePath: string): string {
  return readFileSync(new URL(sourcePath, import.meta.url), "utf8");
}

describe("Studio Align instrument stack composition", () => {
  const stackSource = readSource("../src/components/studio-align-instrument-stack.tsx");
  const navSource = readSource("../src/components/studio-align-nav.tsx");
  const routeSource = readSource("../src/routes/align.tsx");

  it("mounts one shared stack in both basic and expert modes", () => {
    expect(routeSource).toMatch(/<StudioAlignInstrumentStack\s*\/>/);
    expect(routeSource).toMatch(/expert=\{\(\) => <StudioAlignInstrumentStack\s*\/>\}/);
    expect(routeSource).not.toMatch(
      /StudioAlignControls|StudioAlignExpertRight|studio-align-right/,
    );
  });

  it("orders Navigation, Contrast, Tool before Grid/Selection and Action last", () => {
    expect(navSource).toMatch(/<FrameNavigation\b/);
    expect(navSource).toMatch(/<ContrastControl\b/);
    expect(navSource.indexOf("<FrameNavigation")).toBeLessThan(
      navSource.indexOf("<ContrastControl"),
    );

    expect(stackSource).toMatch(/<StudioAlignNav\s*\/>/);
    expect(stackSource).toMatch(/<AlignToolSection\b/);
    expect(stackSource).toMatch(/<AlignGridRail\b/);
    expect(stackSource).toMatch(/<AlignSelectionRail\b/);
    expect(stackSource).toMatch(/title="Action"/);

    const navIdx = stackSource.indexOf("<StudioAlignNav");
    const toolIdx = stackSource.indexOf("<AlignToolSection");
    const gridIdx = stackSource.indexOf("<AlignGridRail");
    const selectionIdx = stackSource.indexOf("<AlignSelectionRail");
    const actionIdx = stackSource.indexOf('title="Action"');

    expect(navIdx).toBeLessThan(toolIdx);
    expect(toolIdx).toBeLessThan(gridIdx);
    expect(gridIdx).toBeLessThan(selectionIdx);
    expect(selectionIdx).toBeLessThan(actionIdx);
  });

  it("reuses AlignToolSection, AlignGridRail, and AlignSelectionRail primitives", () => {
    expect(stackSource).toMatch(/AlignToolSection/);
    expect(stackSource).toMatch(/AlignGridRail/);
    expect(stackSource).toMatch(/AlignSelectionRail/);
    expect(stackSource).not.toMatch(/AlignGridShapeToggle|AlignSelectionPanelSection/);
  });
});

describe("Studio Annotate instrument stack composition", () => {
  const stackSource = readSource("../src/components/studio-annotate-instrument-stack.tsx");
  const navSource = readSource("../src/components/studio-annotate-nav.tsx");
  const routeSource = readSource("../src/routes/annotate.tsx");

  it("mounts one shared stack in both modes with expert-only Shuffle", () => {
    expect(routeSource).toMatch(
      /expert=\{\(\) => <StudioAnnotateInstrumentStack\s+showShuffle\s*\/>\}/,
    );
    expect(routeSource).toMatch(/<StudioAnnotateInstrumentStack\s+showShuffle=\{false\}\s*\/>/);
    expect(routeSource).not.toMatch(
      /StudioAnnotateRight|StudioAnnotateExpertRight|studio-annotate-dock/,
    );
  });

  it("orders Navigation, Contrast, Tool before Mode and Action last", () => {
    expect(navSource).toMatch(/<RoiFrameNavigation\b/);
    expect(navSource).toMatch(/<ContrastControl\b/);
    expect(navSource.indexOf("<RoiFrameNavigation")).toBeLessThan(
      navSource.indexOf("<ContrastControl"),
    );

    expect(stackSource).toMatch(/<StudioAnnotateNav\s*\/>/);
    expect(stackSource).toMatch(/<StudioAnnotateToolSection\s*\/>/);
    expect(stackSource).toMatch(/<StudioAnnotateControlSections\s*\/>/);
    expect(stackSource).toMatch(/<StudioAnnotateActionSection/);

    const navIdx = stackSource.indexOf("<StudioAnnotateNav");
    const toolIdx = stackSource.indexOf("<StudioAnnotateToolSection");
    const modeIdx = stackSource.indexOf("<StudioAnnotateControlSections");
    const actionIdx = stackSource.indexOf("<StudioAnnotateActionSection");

    expect(navIdx).toBeLessThan(toolIdx);
    expect(toolIdx).toBeLessThan(modeIdx);
    expect(modeIdx).toBeLessThan(actionIdx);

    // Tool section mounts AnnotationToolGrid; Mode comes from AnnotationControlRail.
    expect(stackSource).toMatch(/title="Tool"/);
    expect(stackSource).toMatch(/<AnnotationToolGrid\b/);
    expect(stackSource).toMatch(/<AnnotationControlRail\b/);
    expect(stackSource.indexOf('title="Tool"')).toBeLessThan(
      stackSource.indexOf("<AnnotationControlRail"),
    );
    expect(stackSource).toMatch(/title="Action"/);
  });

  it("keeps Shuffle gated to the expert Action section", () => {
    expect(stackSource).toMatch(/showShuffle/);
    expect(stackSource).toMatch(/Shuffle/);
    expect(stackSource).toMatch(/Show when=\{props\.showShuffle\}/);
  });
});

describe("Studio right-rail flattened section contract", () => {
  it("documents Align order Instruction → Nav → Contrast → Tool → Grid → Geometry → Selection → Action", () => {
    const rightPanel = readSource("../src/components/studio-right-panel.tsx");
    const instruction = readSource("../src/components/studio-instruction-section.tsx");
    const stack = readSource("../src/components/studio-align-instrument-stack.tsx");
    const nav = readSource("../src/components/studio-align-nav.tsx");

    expect(rightPanel).toMatch(/StudioInstructionSection/);
    expect(instruction).toMatch(/title="Instruction"/);
    expect(nav).toMatch(/FrameNavigation/);
    expect(nav).toMatch(/ContrastControl/);
    expect(stack).toMatch(/AlignToolSection/);
    expect(stack).toMatch(/AlignGridRail/);
    expect(stack).toMatch(/AlignSelectionRail/);
    expect(stack).toMatch(/title="Action"/);
    // Geometry is owned by AlignGridRail (collapsible sibling of Grid).
    expect(readSource("../../../../packages/ui/src/features/align/align-grid.tsx")).toMatch(
      /title="Geometry"/,
    );
  });

  it("documents Annotate order Instruction → Nav → Contrast → Tool → Mode → Labels → Edit → Brush → Action", () => {
    const stack = readSource("../src/components/studio-annotate-instrument-stack.tsx");
    const controlRail = readSource(
      "../../../../packages/ui/src/features/annotate/annotation-control-rail.tsx",
    );

    expect(stack).toMatch(/StudioAnnotateNav/);
    expect(stack).toMatch(/title="Tool"/);
    expect(stack).toMatch(/AnnotationControlRail/);
    expect(stack).toMatch(/title="Action"/);

    const modeIdx = controlRail.indexOf('title="Mode"');
    const labelsIdx = controlRail.indexOf('title="Labels"');
    const editIdx = controlRail.indexOf('title="Edit"');
    const brushIdx = controlRail.indexOf('title="Brush"');
    expect(modeIdx).toBeGreaterThan(-1);
    expect(modeIdx).toBeLessThan(labelsIdx);
    expect(labelsIdx).toBeLessThan(editIdx);
    expect(editIdx).toBeLessThan(brushIdx);
  });

  it("removes the unused StudioAlignRight leftover", () => {
    expect(() => readSource("../src/components/studio-align-right.tsx")).toThrow();
  });
});
