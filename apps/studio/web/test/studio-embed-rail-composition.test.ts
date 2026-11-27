import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

function readSource(sourcePath: string): string {
  return readFileSync(new URL(sourcePath, import.meta.url), "utf8");
}

describe("Studio Align instrument stack composition", () => {
  const stackSource = readSource("../src/components/studio-align-instrument-stack.ts");
  const navSource = readSource("../src/components/studio-align-nav.ts");
  const routeSource = readSource("../src/routes/align.ts");

  it("stacks Navigation, Contrast, Geometry, and Drift above Grid, Tool, Selection, and Action", () => {
    const expertBlock =
      stackSource.match(/\? StudioAlignNav\([\s\S]*?:\s*\[([\s\S]*?)\]\s*\),/)?.[1] ?? "";
    expect(expertBlock).toMatch(/StudioAlignNav\(h,/);
    expect(expertBlock).toMatch(/gridRail\("geometry"\)/);
    expect(expertBlock).toMatch(/AlignDriftRail\(h,/);
    expect(expertBlock).not.toMatch(
      /AlignSelectionRail|AlignToolSection|title:\s*"Action"|gridRail\("grid"\)/,
    );

    const navIdx = stackSource.indexOf("...StudioAlignNav(h,");
    const geometryIdx = stackSource.indexOf('gridRail("geometry")');
    const driftIdx = stackSource.indexOf("AlignDriftRail(h,");
    const gridIdx = stackSource.indexOf('gridRail("grid")');
    const toolIdx = stackSource.indexOf("AlignToolSection(h,");
    const selectionIdx = stackSource.indexOf("AlignSelectionRail(h,");
    const actionIdx = stackSource.indexOf('title: "Action"');
    expect(navIdx).toBeGreaterThan(-1);
    expect(navIdx).toBeLessThan(geometryIdx);
    expect(geometryIdx).toBeLessThan(driftIdx);
    expect(driftIdx).toBeLessThan(gridIdx);
    expect(gridIdx).toBeLessThan(toolIdx);
    expect(toolIdx).toBeLessThan(selectionIdx);
    expect(selectionIdx).toBeLessThan(actionIdx);
  });

  it("uses the shared Action vocabulary: Save, Back, Next, Crop", () => {
    const action = stackSource.slice(stackSource.indexOf('title: "Action"'));
    const labels = [...action.matchAll(/\.children\(\s*"(Save|Back|Next|Crop|Continue)"/g)].map(
      (match) => match[1],
    );
    expect(labels).toEqual(["Save", "Back", "Next", "Crop"]);
    expect(action).not.toMatch(/\.children\(\s*"(Exclude|Jump)"/);
    expect(action).not.toMatch(/saveAndAdvance/);
  });

  it("mounts one shared stack in both basic and expert modes", () => {
    expect(routeSource).toMatch(/children:\s*StudioAlignInstrumentStack\(h,\s*stackProps\)/);
    expect(routeSource).toMatch(
      /expert:\s*StudioAlignInstrumentStack\(h,\s*\{\s*\.\.\.stackProps,\s*expert:\s*true\s*\}\)/,
    );
    expect(routeSource).not.toMatch(
      /StudioAlignControls|StudioAlignExpertRight|studio-align-right/,
    );
  });

  it("orders Navigation and Contrast before Geometry, then Grid, Tool, Selection, and Action", () => {
    expect(navSource).toMatch(/FrameNavigation\(h,/);
    expect(navSource).toMatch(/ContrastControl\(h,/);
    expect(navSource).not.toMatch(/!standard[\s\S]*ContrastControl/);
    expect(navSource.indexOf("FrameNavigation(h,")).toBeLessThan(
      navSource.indexOf("ContrastControl(h,"),
    );

    expect(stackSource).toMatch(/StudioAlignNav\(h,\s*\{[\s\S]*?standard:\s*true/);
    expect(stackSource).toMatch(/\.\.\.StudioAlignNav\(h,\s*\{/);
    expect(stackSource).toMatch(/AlignToolSection\(h,/);
    expect(stackSource).toMatch(/AlignGridRail\(h,/);
    expect(stackSource).toMatch(/\brailPart\b/);
    expect(stackSource).toMatch(/AlignSelectionRail\(h,/);
    expect(stackSource).toMatch(/:not\(\[data-unavailable\]\)/);
    expect(stackSource).toMatch(/title:\s*"Action"/);
  });

  it("reuses AlignToolSection, AlignGridRail, and AlignSelectionRail primitives", () => {
    expect(stackSource).toMatch(/AlignToolSection/);
    expect(stackSource).toMatch(/AlignGridRail/);
    expect(stackSource).toMatch(/AlignSelectionRail/);
    expect(stackSource).not.toMatch(/AlignGridShapeToggle|AlignSelectionPanelSection/);
  });
});

describe("Studio Annotate instrument stack composition", () => {
  const stackSource = readSource("../src/components/studio-annotate-instrument-stack.ts");
  const navSource = readSource("../src/components/studio-annotate-nav.ts");
  const routeSource = readSource("../src/routes/annotate.ts");

  it("shows channel and frame in standard mode and full navigation in expert mode", () => {
    expect(routeSource).toMatch(/StudioAnnotateInstrumentStack\(h,/);
    expect(routeSource).not.toMatch(/expert:\s*StudioAnnotateInstrumentStack/);
    expect(routeSource).not.toMatch(/showShuffle|Shuffle/);
    expect(routeSource).not.toMatch(
      /StudioAnnotateRight|StudioAnnotateExpertRight|studio-annotate-dock/,
    );
    expect(stackSource).toMatch(/StudioAnnotateNav\(h,\s*\{[\s\S]*?standard:\s*!expertMode/);
  });

  it("orders Navigation and Contrast, then Mode before Tool, and Action last", () => {
    expect(navSource).toMatch(/RoiFrameNavigation\(h,/);
    expect(navSource).toMatch(/ContrastControl\(h,/);
    expect(navSource).not.toMatch(/!standard[\s\S]*ContrastControl/);
    expect(navSource.indexOf("RoiFrameNavigation(h,")).toBeLessThan(
      navSource.indexOf("ContrastControl(h,"),
    );

    expect(stackSource).toMatch(/StudioAnnotateNav\(h,/);
    expect(stackSource).toMatch(/AnnotationControlRail\(h,/);
    expect(stackSource).toMatch(/insertAfterMode:\s*toolSection/);

    const returnBlock = stackSource.slice(stackSource.lastIndexOf("return ["));
    const navIdx = returnBlock.indexOf("StudioAnnotateNav(h,");
    const controlsIdx = returnBlock.indexOf("controlSections");
    const actionIdx = returnBlock.indexOf("actionSection");

    expect(navIdx).toBeGreaterThan(-1);
    expect(navIdx).toBeLessThan(controlsIdx);
    expect(controlsIdx).toBeLessThan(actionIdx);

    expect(stackSource).toMatch(/title:\s*"Tool"/);
    expect(stackSource).toMatch(/AnnotationToolGrid\(h,/);
    expect(stackSource).toMatch(/AnnotationControlRail\(h,/);
    expect(stackSource).toMatch(/title:\s*"Action"/);
    const controlRail = readSource(
      "../../../../packages/instrument/src/annotate/annotation-control-rail.ts",
    );
    expect(controlRail.indexOf('title: "Mode"')).toBeLessThan(
      controlRail.indexOf("options.insertAfterMode"),
    );
    expect(controlRail.indexOf("options.insertAfterMode")).toBeLessThan(
      controlRail.indexOf('title: "Labels"'),
    );
  });

  it("drops Shuffle and wires Back and Next to the align chords", () => {
    expect(stackSource).not.toMatch(/Shuffle|showShuffle|shuffleSelection/);
    expect(routeSource).toMatch(/studioCommandShortcutSubscription[\s\S]*?"back"/);
    expect(routeSource).toMatch(/studioCommandShortcutSubscription[\s\S]*?"next"/);
    expect(stackSource).toMatch(/commandShortcutKeys\("back"\)/);
    expect(stackSource).toMatch(/commandShortcutKeys\("next"\)/);
  });
});

describe("Studio right-rail flattened section contract", () => {
  it("documents Align order Nav → Contrast → Geometry → Drift → Grid → Tool → Selection → Action", () => {
    const rightPanel = readSource("../src/components/studio-right-panel.ts");
    const stack = readSource("../src/components/studio-align-instrument-stack.ts");
    const nav = readSource("../src/components/studio-align-nav.ts");

    expect(rightPanel).not.toMatch(/StudioInstructionSection/);
    expect(nav).toMatch(/FrameNavigation/);
    expect(nav).toMatch(/ContrastControl/);
    expect(stack).toMatch(/AlignToolSection/);
    expect(stack).toMatch(/AlignGridRail/);
    expect(stack).toMatch(/AlignSelectionRail/);
    expect(stack).toMatch(/title:\s*"Action"/);
    // Geometry is owned by AlignGridRail (collapsible sibling of Grid).
    expect(readSource("../../../../packages/instrument/src/align/align-grid.ts")).toMatch(
      /title:\s*"Geometry"/,
    );
  });

  it("documents Annotate order Nav → Contrast → Mode → Tool → Labels → Edit → Brush → Action", () => {
    const stack = readSource("../src/components/studio-annotate-instrument-stack.ts");
    const controlRail = readSource(
      "../../../../packages/instrument/src/annotate/annotation-control-rail.ts",
    );

    expect(stack).toMatch(/StudioAnnotateNav/);
    expect(stack).toMatch(/title:\s*"Tool"/);
    expect(stack).toMatch(/AnnotationControlRail/);
    expect(stack).toMatch(/title:\s*"Action"/);

    const modeIdx = controlRail.indexOf('title: "Mode"');
    const labelsIdx = controlRail.indexOf('title: "Labels"');
    const editIdx = controlRail.indexOf('title: "Edit"');
    const brushIdx = controlRail.indexOf('title: "Brush"');
    expect(modeIdx).toBeGreaterThan(-1);
    expect(modeIdx).toBeLessThan(labelsIdx);
    expect(labelsIdx).toBeLessThan(editIdx);
    expect(editIdx).toBeLessThan(brushIdx);
  });

  it("removes the unused StudioAlignRight leftover", () => {
    expect(() => readSource("../src/components/studio-align-right.ts")).toThrow();
    expect(() => readSource("../src/components/studio-align-right.tsx")).toThrow();
  });
});
