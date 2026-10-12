import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createDefaultAlignGrid } from "@lisca/utils";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  alignStagePlaceholder,
  analysisStagePlaceholder,
  annotateStagePlaceholder,
  isWorkspaceDataMissingError,
  StudioStagePlaceholderView,
} from "../src/components/studio-stage-placeholder";
import type { StudioAlignPageContextValue } from "../src/state/studio-align-page-context";

const navigateTo = vi.fn();

vi.mock("../src/navigation/use-studio-navigate", () => ({
  useStudioNavigate: () => ({ navigateTo }),
}));

const annotateHarness: { state: Record<string, unknown> } = { state: {} };

vi.mock("../src/state/studio-annotate-page-context", () => ({
  useStudioAnnotatePage: () => ({
    get state() {
      return annotateHarness.state;
    },
  }),
}));

import { StudioAlignMain } from "../src/components/studio-align-main";
import { StudioAnnotateMain } from "../src/components/studio-annotate-main";
import { StudioAlignPageContext } from "../src/state/studio-align-page-context";

afterEach(() => {
  cleanup();
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
  it("centers the title and action in the sheet", () => {
    render(() => (
      <StudioStagePlaceholderView
        actionLabel="Go to Metadata"
        description="Check that the data is still there, or go to Metadata and open the correct workspace."
        title="Data not found"
        onAction={() => navigateTo("/metadata")}
      />
    ));

    const title = screen.getByText("Data not found");
    const centered = title.closest(".justify-center");
    expect(centered).not.toBeNull();
    expect(centered?.classList.contains("items-center")).toBe(true);
    expect(centered?.classList.contains("h-full")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Go to Metadata" }));
    expect(navigateTo).toHaveBeenCalledWith("/metadata");
  });
});

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
    cropStartConfirm: null,
    cropConfirm: null,
    cropProgress: null,
    cropping: false,
    ...overrides,
  };
  render(() => (
    <StudioAlignPageContext.Provider value={{ state } as unknown as StudioAlignPageContextValue}>
      <StudioAlignMain />
    </StudioAlignPageContext.Provider>
  ));
}

describe("StudioAlignMain placeholder", () => {
  it("shows the assay placeholder instead of an empty canvas", () => {
    renderAlign({});
    expect(screen.getByText("No assay loaded")).toBeTruthy();
    expect(screen.queryByText("No frame")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Go to Metadata" }));
    expect(navigateTo).toHaveBeenCalledWith("/metadata");
  });

  it("shows the data placeholder instead of the missing-file toast", () => {
    renderAlign({
      workspacePath: "/data/ws",
      source: { kind: "nd2", path: "D:\\missing.nd2" },
      error: "The system cannot find the file specified. (os error 2)",
    });
    expect(screen.getByText("Data not found")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

function renderAnnotate(overrides: Record<string, unknown>) {
  annotateHarness.state = {
    workspacePath: null,
    workspaceMissing: true,
    scanLoading: false,
    scan: null,
    scanError: null,
    request: null,
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
  };
  render(() => <StudioAnnotateMain />);
}

describe("StudioAnnotateMain placeholder", () => {
  it("shows the assay placeholder when no workspace is open", () => {
    renderAnnotate({});
    expect(screen.getByText("No assay loaded")).toBeTruthy();
    expect(screen.queryByText("No frame")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Go to Metadata" }));
    expect(navigateTo).toHaveBeenCalledWith("/metadata");
  });

  it("still points an empty crop at Align", () => {
    renderAnnotate({
      workspacePath: "/data/ws",
      workspaceMissing: false,
      scan: { positions: [] },
    });
    expect(screen.getByText("No cropped ROIs")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Go to Align" }));
    expect(navigateTo).toHaveBeenCalledWith("/align");
  });
});
