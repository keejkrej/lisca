import { cleanup, render, screen, within } from "@solidjs/testing-library";
import { createDefaultAlignGrid } from "@lisca/utils";
import { afterEach, describe, expect, it } from "vitest";

import { AlignSelectionRail } from "../src/features/align/align-selection-rail";
import { AlignToolToolbar } from "../src/features/align/align-tools";
import { AnnotationControlRail } from "../src/features/annotate/annotation-control-rail";
import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
} from "../src/features/annotate/annotation-tool-grid";

afterEach(cleanup);

function sectionFor(name: string) {
  const section = screen.getByRole("button", { name }).closest('[data-slot="panel"]');
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

const selectionProps = {
  excludedCells: [],
  frame: null,
  grid: createDefaultAlignGrid(),
  manualExclusionEnabled: false,
  showVariationExcludeDialog: false,
  variationExcludePreview: null,
  visibleCounts: { included: 0, excluded: 0 },
  onApplyVariationExclude: () => undefined,
  onCancelVariationExclude: () => undefined,
  onExcludedCellsChange: () => undefined,
  onManualExclusionEnabledChange: () => undefined,
  onSmartExclude: () => undefined,
  onVariationExclude: () => undefined,
  onVariationExcludeThresholdChange: () => undefined,
};

const annotationProps = {
  activeLabelId: null,
  annotation: {
    current: { classificationLabelId: null, mask: new Uint8Array() },
    dirty: false,
    canUndo: false,
    canRedo: false,
    undo: () => undefined,
    redo: () => undefined,
    discard: () => undefined,
    commit: () => undefined,
  },
  brushSize: 8,
  canEdit: true,
  frame: null,
  labels: [],
  mode: "classification" as const,
  openLabelDialog: () => undefined,
  overlayOpacity: 0.65,
  setActiveLabelId: () => undefined,
  setBrushSize: () => undefined,
  setMode: () => undefined,
  setOverlayOpacity: () => undefined,
  workspacePath: "/workspace",
};

describe("stage rail feature composition", () => {
  it("packs the Selection task cluster into three compact control pairs", () => {
    render(() => <AlignSelectionRail {...selectionProps} sectionAppearance="rail" />);

    const section = sectionFor("Selection");
    const pairs = within(section).getAllByRole("group");
    expect(pairs.map((pair) => pair.getAttribute("aria-label"))).toEqual([
      "Selection editing",
      "Bulk exclusion",
      "Assisted exclusion",
    ]);
    expect(
      pairs.map((pair) =>
        within(pair)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ),
    ).toEqual([
      ["Edit", "Reset"],
      ["Exclude all", "Edge exclude"],
      ["Var exclude", "Smart exclude"],
    ]);
  });

  it("stacks user-authored Labels while packing fixed Edit peers", () => {
    render(() => <AnnotationControlRail {...annotationProps} sectionAppearance="rail" />);

    const mode = sectionFor("Mode");
    expect(mode.querySelectorAll('[data-rail-layout="stack"]')).toHaveLength(1);
    expect(mode.querySelector('[data-rail-layout="stack"]')?.children).toHaveLength(1);
    expect(within(mode).getByRole("button", { name: "Classification" })).toBeTruthy();

    const labels = sectionFor("Labels");
    expect(labels.querySelector('[data-rail-layout="stack"]')).not.toBeNull();
    expect(labels.querySelector('[data-rail-layout="action-pair"]')).toBeNull();
    expect(within(labels).getByRole("button", { name: "Add" })).toBeTruthy();

    const edit = sectionFor("Edit");
    expect(
      within(edit)
        .getAllByRole("group")
        .map((group) => group.getAttribute("aria-label")),
    ).toEqual(["History", "Annotation cleanup"]);
    expect(
      within(edit)
        .getAllByRole("group")
        .flatMap((group) =>
          within(group)
            .getAllByRole("button")
            .map((button) => button.textContent),
        ),
    ).toEqual(["Undo", "Redo", "Clear", "Discard"]);
  });

  it("keeps shortcut badges on the instrument font in both apps", () => {
    const view = render(() => (
      <>
        <AlignToolToolbar layout="rail" mode="pan" onModeChange={() => undefined} />
        <AnnotationToolGrid
          canEditTools
          layout="rail"
          toolActions={buildAnnotationToolActions("brush", () => undefined, false)}
        />
      </>
    ));

    const shortcuts = view.container.querySelectorAll("kbd");
    expect(shortcuts.length).toBeGreaterThan(0);
    expect(
      Array.from(shortcuts).every((shortcut) => shortcut.classList.contains("font-[inherit]")),
    ).toBe(true);
  });
});
