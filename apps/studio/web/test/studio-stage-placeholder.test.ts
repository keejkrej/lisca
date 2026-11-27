import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { SmartSegmentState } from "@lisca/smart/segment";
import { createDefaultAlignGrid } from "@lisca/utils";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioAlignMain } from "../src/components/studio-align-main";
import { StudioAnnotateMain } from "../src/components/studio-annotate-main";
import {
  alignStagePlaceholder,
  analysisStagePlaceholder,
  annotateStagePlaceholder,
  isWorkspaceDataMissingError,
  StudioStagePlaceholderView,
} from "../src/components/studio-stage-placeholder";
import type { StudioAlignPointerHandlers } from "../src/state/studio-align-page-context";
import type { StudioAlignState } from "../src/state/use-studio-align-state";
import type { StudioAnnotateState } from "../src/state/use-studio-annotate-state";
import { cleanupMounted, clickElement, mountTest, waitForCondition } from "./render-helper";

const navigateTo = vi.fn();

const PlaceholderHostMsg = UiSchema.TaggedEnum({
  Navigate: { to: Schema.String },
  Noop: {},
});

function findButton(container: HTMLElement, name: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => (button.textContent ?? "").trim() === name,
  );
}

function mountPlaceholderHost(renderView: (h: Html.H<typeof PlaceholderHostMsg.Type>) => any) {
  const Host = Html.component({
    name: "StudioStagePlaceholderTestHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: PlaceholderHostMsg,
  }).make({
    init: () => ({}),
    update: {
      Navigate: ($, { to }) => {
        navigateTo(to);
        return $.model;
      },
      Noop: ($) => $.model,
    },
    view: (h) => h.div.class("contents").children(renderView(h)),
  });
  return mountTest(Host as any, {});
}

afterEach(async () => {
  await cleanupMounted();
  navigateTo.mockClear();
});

describe("stage placeholder decisions", () => {
  it("treats missing source files as data that is not there", () => {
    expect(isWorkspaceDataMissingError("No such file or directory (os error 2)")).toBe(true);
    expect(
      isWorkspaceDataMissingError("The system cannot find the file specified. (os error 2)"),
    ).toBe(true);
    expect(isWorkspaceDataMissingError("D:\\assay is not a directory")).toBe(true);
    expect(isWorkspaceDataMissingError("All grid patterns are excluded")).toBe(false);
  });

  it("asks Align to open an assay, and replaces a missing source with the placeholder", () => {
    expect(
      alignStagePlaceholder({
        workspacePath: null,
        hasSource: false,
        scanLoading: false,
        hasScan: false,
        alignPositionCount: 0,
        error: null,
      })?.title,
    ).toBe("No assay loaded");

    expect(
      alignStagePlaceholder({
        workspacePath: "/data/ws",
        hasSource: false,
        scanLoading: false,
        hasScan: false,
        alignPositionCount: 0,
        error: null,
      }),
    ).toMatchObject({
      title: "Data not found",
      action: "metadata",
    });

    expect(
      alignStagePlaceholder({
        workspacePath: "/data/ws",
        hasSource: true,
        scanLoading: false,
        hasScan: false,
        alignPositionCount: 0,
        error: "source scan failed: No such file or directory (os error 2)",
      })?.title,
    ).toBe("Data not found");

    expect(
      alignStagePlaceholder({
        workspacePath: "/data/ws",
        hasSource: true,
        scanLoading: true,
        hasScan: false,
        alignPositionCount: 0,
        error: null,
      }),
    ).toBeNull();

    expect(
      alignStagePlaceholder({
        workspacePath: "/data/ws",
        hasSource: true,
        scanLoading: false,
        hasScan: true,
        alignPositionCount: 0,
        error:
          "No assay positions found in source scan — check position ranges on the Metadata step",
      })?.description,
    ).toMatch(/position ranges/);

    expect(
      alignStagePlaceholder({
        workspacePath: "/data/ws",
        hasSource: true,
        scanLoading: false,
        hasScan: true,
        alignPositionCount: 2,
        error: "Save failed",
      }),
    ).toBeNull();
  });

  it("shows Annotate a placeholder when no assay is loaded, and keeps the crop prompt", () => {
    expect(
      annotateStagePlaceholder({
        workspaceMissing: true,
        scanLoading: false,
        positionCount: null,
        scanError: null,
      }),
    ).toMatchObject({
      title: "No assay loaded",
      action: "metadata",
    });

    expect(
      annotateStagePlaceholder({
        workspaceMissing: false,
        scanLoading: false,
        positionCount: 0,
        scanError: null,
      }),
    ).toMatchObject({
      title: "No cropped ROIs",
      action: "align",
    });

    expect(
      annotateStagePlaceholder({
        workspaceMissing: false,
        scanLoading: false,
        positionCount: null,
        scanError: "ROI workspace load failed: cannot find the path (os error 3)",
      })?.title,
    ).toBe("Data not found");

    expect(
      annotateStagePlaceholder({
        workspaceMissing: false,
        scanLoading: true,
        positionCount: null,
        scanError: null,
      }),
    ).toBeNull();

    expect(
      annotateStagePlaceholder({
        workspaceMissing: false,
        scanLoading: false,
        positionCount: 3,
        scanError: "labels boom",
      }),
    ).toBeNull();
  });

  it("keeps the Analysis copy and only returns it when that view has no plots", () => {
    expect(
      analysisStagePlaceholder({
        workspacePath: "",
        hasAnyPlots: false,
        sectionPlotCount: 0,
      }),
    ).toMatchObject({
      title: "No assay loaded",
      description: "Open a workspace on Metadata. Analysis shows the plots from that assay.",
      actionLabel: "Go to Metadata",
      action: "metadata",
    });

    expect(
      analysisStagePlaceholder({
        workspacePath: "/data/ws",
        hasAnyPlots: false,
        sectionPlotCount: 0,
      }),
    ).toMatchObject({
      title: "No plots yet",
      actionLabel: "Go to Annotate",
      action: "annotate",
    });

    expect(
      analysisStagePlaceholder({
        workspacePath: "/data/ws",
        hasAnyPlots: true,
        sectionPlotCount: 0,
      })?.actionLabel,
    ).toBeUndefined();

    expect(
      analysisStagePlaceholder({
        workspacePath: "/data/ws",
        hasAnyPlots: true,
        sectionPlotCount: 2,
      }),
    ).toBeNull();
  });
});

describe("StudioStagePlaceholderView", () => {
  it("centers the title and action in the sheet", async () => {
    const { container } = await mountPlaceholderHost((h) =>
      StudioStagePlaceholderView(h, {
        actionLabel: "Go to Metadata",
        description:
          "Check that the data is still there, or go to Metadata and open the correct workspace.",
        title: "Data not found",
        onAction: PlaceholderHostMsg.Navigate({ to: "/metadata" }),
      }),
    );

    const title = Array.from(container.querySelectorAll("p")).find(
      (el) => (el.textContent ?? "").trim() === "Data not found",
    )!;
    expect(title).toBeTruthy();
    const centered = title.closest(".justify-center");
    expect(centered).not.toBeNull();
    expect(centered?.classList.contains("items-center")).toBe(true);
    expect(centered?.classList.contains("h-full")).toBe(true);
    clickElement(findButton(container, "Go to Metadata")!);
    await waitForCondition(() => navigateTo.mock.calls.length === 1);
    expect(navigateTo).toHaveBeenCalledWith("/metadata");
  });
});

const stubPointer = {
  cursor: () => "grab",
  previewGridRef: { current: null },
  previewRedrawRef: { current: null },
  handlePointerCancel: () => undefined,
  handlePointerDown: () => undefined,
  handlePointerMove: () => undefined,
  handlePointerEnd: () => undefined,
} as unknown as StudioAlignPointerHandlers;

function renderAlign(overrides: Record<string, unknown>) {
  const state = {
    workspacePath: null,
    source: null,
    scan: null,
    alignPositions: [],
    scanLoading: false,
    frameLoading: false,
    error: null,
    status: null,
    positionSaveState: "unsaved",
    selection: { pos: 0, channel: 0, time: 0, z: 0 },
    effectiveGrid: createDefaultAlignGrid(),
    toolMode: "pan",
    spacingZoomLocked: false,
    patternZoomLocked: false,
    manualExclusionEnabled: false,
    currentExcludedPatterns: [],
    displayedExcludedPatterns: [],
    frame: null,
    commitCanvas: () => undefined,
    setExcludedPatternsForCurrentPosition: () => undefined,
    unsavedChangesPrompt: false,
    saving: false,
    cropStartConfirm: null,
    cropConfirm: null,
    cropProgress: null,
    cropping: false,
    ...overrides,
  } as unknown as StudioAlignState;

  return mountPlaceholderHost((h) =>
    StudioAlignMain(h, {
      state,
      pointer: stubPointer,
      visibleStatus: null,
      onNavigate: (to) => PlaceholderHostMsg.Navigate({ to }),
      onResolveUnsavedChanges: () => PlaceholderHostMsg.Noop(),
      onCancelCropStart: PlaceholderHostMsg.Noop(),
      onStartConfirmedCrop: PlaceholderHostMsg.Noop(),
      onGoToUnaligned: PlaceholderHostMsg.Noop(),
      onCancelCropConfirm: PlaceholderHostMsg.Noop(),
      onSkipExistingCrop: PlaceholderHostMsg.Noop(),
      onConfirmCropOverwrite: PlaceholderHostMsg.Noop(),
    }),
  );
}

describe("StudioAlignMain placeholder", () => {
  it("shows the assay placeholder instead of an empty canvas", async () => {
    const { container } = await renderAlign({});
    expect(container.textContent).toContain("No assay loaded");
    expect(container.textContent).not.toContain("No frame");
    clickElement(findButton(container, "Go to Metadata")!);
    await waitForCondition(() => navigateTo.mock.calls.length === 1);
    expect(navigateTo).toHaveBeenCalledWith("/metadata");
  });

  it("shows the data placeholder instead of the missing-file toast", async () => {
    const { container } = await renderAlign({
      workspacePath: "/data/ws",
      source: { kind: "nd2", path: "D:\\missing.nd2" },
      error: "The system cannot find the file specified. (os error 2)",
    });
    expect(container.textContent).toContain("Data not found");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});

const stubSmartSegmentState = {
  busy: false,
  prompts: [],
} as unknown as SmartSegmentState;

function renderAnnotate(overrides: Record<string, unknown>) {
  const state = {
    workspacePath: null,
    workspaceMissing: true,
    scanLoading: false,
    scan: null,
    scanError: null,
    request: null,
    selection: { pos: null, roi: null, channel: null, time: null, z: null },
    contrast: null,
    frame: null,
    tool: "brush",
    labels: [],
    activeLabelId: null,
    brushSize: 8,
    overlayOpacity: 0.5,
    canEditSegmentation: false,
    canvasToasts: [],
    annotation: {
      current: { mask: new Uint8Array(), classificationLabelId: null },
      commit: () => undefined,
    },
    ...overrides,
  } as unknown as StudioAnnotateState;

  return mountPlaceholderHost((h) =>
    StudioAnnotateMain(h, {
      state,
      smartSegmentState: stubSmartSegmentState,
      smartSegmentStatus: null,
      smartSegmentError: null,
      onNavigate: (to) => PlaceholderHostMsg.Navigate({ to }),
      onMaskCommit: () => PlaceholderHostMsg.Noop(),
      onSmartSegmentClick: () => PlaceholderHostMsg.Noop(),
      onSmartEraseClick: () => PlaceholderHostMsg.Noop(),
    }),
  );
}

describe("StudioAnnotateMain placeholder", () => {
  it("shows the assay placeholder when no workspace is open", async () => {
    const { container } = await renderAnnotate({});
    expect(container.textContent).toContain("No assay loaded");
    expect(container.textContent).not.toContain("No frame");
    clickElement(findButton(container, "Go to Metadata")!);
    await waitForCondition(() => navigateTo.mock.calls.length === 1);
    expect(navigateTo).toHaveBeenCalledWith("/metadata");
  });

  it("still points an empty crop at Align", async () => {
    const { container } = await renderAnnotate({
      workspacePath: "/data/ws",
      workspaceMissing: false,
      scan: { positions: [] },
    });
    expect(container.textContent).toContain("No cropped ROIs");
    clickElement(findButton(container, "Go to Align")!);
    await waitForCondition(() => navigateTo.mock.calls.length === 1);
    expect(navigateTo).toHaveBeenCalledWith("/align");
  });
});
