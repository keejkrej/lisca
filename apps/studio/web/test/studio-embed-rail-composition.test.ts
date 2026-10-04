import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

function readSource(sourcePath: string): string {
  return readFileSync(new URL(sourcePath, import.meta.url), "utf8");
}

describe("Studio Align instrument stack composition", () => {
  const stackSource = readSource("../src/components/studio-align-instrument-stack.tsx");
  const navSource = readSource("../src/components/studio-align-nav.tsx");
  const routeSource = readSource("../src/routes/align.tsx");

  it("stacks Navigation, Contrast, and Geometry above Grid, Tool, Selection, and Action", () => {
    const expertBlock =
      stackSource.match(/<Show when=\{props\.expert\}>([\s\S]*?)<\/Show>/)?.[1] ?? "";
    expect(expertBlock).toMatch(/<StudioAlignNav\s*\/>/);
    expect(expertBlock).toMatch(/gridRail\("geometry"\)/);
    expect(expertBlock).not.toMatch(
      /<AlignSelectionRail|<AlignToolSection|title="Action"|gridRail\("grid"\)/,
    );

    const navIdx = stackSource.indexOf("<StudioAlignNav");
    const geometryIdx = stackSource.indexOf('gridRail("geometry")');
    const gridIdx = stackSource.indexOf('{gridRail("grid")}');
    const toolIdx = stackSource.indexOf("<AlignToolSection");
    const selectionIdx = stackSource.indexOf("<AlignSelectionRail");
    const actionIdx = stackSource.indexOf('title="Action"');
    expect(navIdx).toBeLessThan(geometryIdx);
    expect(geometryIdx).toBeLessThan(gridIdx);
    expect(gridIdx).toBeLessThan(toolIdx);
    expect(toolIdx).toBeLessThan(selectionIdx);
    expect(selectionIdx).toBeLessThan(actionIdx);
  });

  it("uses the shared Action vocabulary: Save, Back, Next, Crop", () => {
    const action = stackSource.slice(stackSource.indexOf('title="Action"'));
    const labels = [
      ...action.matchAll(/>\s*(\{[^}]*"Save"\}|Save|Back|Next|Crop|Continue)\s*</g),
    ].map((match) => (match[1]!.includes("Save") ? "Save" : match[1]));
    expect(labels).toEqual(["Save", "Back", "Next", "Crop"]);
    expect(action).not.toMatch(/>\s*(Exclude|Jump)\s*</);
    expect(action).not.toMatch(/saveAndAdvance/);
  });

  it("mounts one shared stack in both basic and expert modes", () => {
    expect(routeSource).toMatch(/<StudioAlignInstrumentStack\s*\/>/);
    expect(routeSource).toMatch(/expert=\{\(\) => <StudioAlignInstrumentStack expert\s*\/>\}/);
    expect(routeSource).not.toMatch(
      /StudioAlignControls|StudioAlignExpertRight|studio-align-right/,
    );
  });

  it("orders Navigation and Contrast before Geometry, then Grid, Tool, Selection, and Action", () => {
    expect(navSource).toMatch(/<FrameNavigation\b/);
    expect(navSource).toMatch(/<ContrastControl\b/);
    expect(navSource.indexOf("<FrameNavigation")).toBeLessThan(
      navSource.indexOf("<ContrastControl"),
    );

    expect(stackSource).toMatch(/<StudioAlignNav\s+frameOnly\s*\/>/);
    expect(stackSource).toMatch(/<StudioAlignNav\s*\/>/);
    expect(stackSource).toMatch(/<AlignToolSection\b/);
    expect(stackSource).toMatch(/<AlignGridRail\b/);
    expect(stackSource).toMatch(/railPart=\{railPart\}/);
    expect(stackSource).toMatch(/<AlignSelectionRail\b/);
    expect(stackSource).toMatch(/title="Action"/);
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

  it("shows the frame slider in standard mode and full navigation in expert mode", () => {
    expect(routeSource).toMatch(/<StudioAnnotateInstrumentStack\s*\/>/);
    expect(routeSource).not.toMatch(/expert=\{\(\) => <StudioAnnotateInstrumentStack/);
    expect(routeSource).not.toMatch(/showShuffle|Shuffle/);
    expect(routeSource).not.toMatch(
      /StudioAnnotateRight|StudioAnnotateExpertRight|studio-annotate-dock/,
    );
    expect(stackSource).toMatch(/<StudioAnnotateNav\s+frameOnly\s*\/>/);
    const expertBlock =
      stackSource.match(/<Show when=\{expertMode\(\)\}>([\s\S]*?)<\/Show>/)?.[1] ?? "";
    expect(expertBlock).toMatch(/<StudioAnnotateNav\s*\/>/);
    expect(expertBlock).not.toMatch(/Tool|Action|AnnotationControlRail/);
  });

  it("orders Navigation and Contrast, then Mode before Tool, and Action last", () => {
    expect(navSource).toMatch(/<RoiFrameNavigation\b/);
    expect(navSource).toMatch(/<ContrastControl\b/);
    expect(navSource.indexOf("<RoiFrameNavigation")).toBeLessThan(
      navSource.indexOf("<ContrastControl"),
    );

    expect(stackSource).toMatch(/<StudioAnnotateNav\s*\/>/);
    expect(stackSource).toMatch(/<StudioAnnotateControlSections\s*\/>/);
    expect(stackSource).toMatch(/<StudioAnnotateActionSection/);
    expect(stackSource).toMatch(/insertAfterMode=\{<StudioAnnotateToolSection\s*\/>\}/);

    const navIdx = stackSource.indexOf("<StudioAnnotateNav");
    const controlsIdx = stackSource.indexOf("<StudioAnnotateControlSections");
    const actionIdx = stackSource.indexOf("<StudioAnnotateActionSection");

    expect(navIdx).toBeLessThan(controlsIdx);
    expect(controlsIdx).toBeLessThan(actionIdx);

    expect(stackSource).toMatch(/title="Tool"/);
    expect(stackSource).toMatch(/<AnnotationToolGrid\b/);
    expect(stackSource).toMatch(/<AnnotationControlRail\b/);
    expect(stackSource).toMatch(/title="Action"/);
    const controlRail = readSource(
      "../../../../packages/ui/src/features/annotate/annotation-control-rail.tsx",
    );
    expect(controlRail.indexOf('title="Mode"')).toBeLessThan(
      controlRail.indexOf("{props.insertAfterMode}"),
    );
    expect(controlRail.indexOf("{props.insertAfterMode}")).toBeLessThan(
      controlRail.indexOf('title="Labels"'),
    );
  });

  it("drops Shuffle and wires Back and Next to the align chords", () => {
    expect(stackSource).not.toMatch(/Shuffle|showShuffle|shuffleSelection/);
    expect(stackSource).toMatch(/useStudioCommandShortcut\(\s*"back"/);
    expect(stackSource).toMatch(/useStudioCommandShortcut\(\s*"next"/);
  });
});

describe("Studio right-rail flattened section contract", () => {
  it("documents Align order Instruction → Nav → Contrast → Geometry → Grid → Tool → Selection → Action", () => {
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

  it("documents Annotate order Instruction → Nav → Contrast → Mode → Tool → Labels → Edit → Brush → Action", () => {
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
