import type {
  AlignerSource,
  AnnotationLabel,
  RoiFrameRequest,
  RoiWorkspaceScan,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";
import { createAlignSessionController } from "@lisca/client/align-session/controller";
import {
  clearRoiFrameCache,
  createAnnotateSessionController,
} from "@lisca/client/annotate-session/controller";
import { createAlignUiActions, createInitialAlignUiState } from "@lisca/client/atoms/align-ui";
import {
  createAnnotatorUiActions,
  createInitialAnnotatorUiState,
} from "@lisca/client/atoms/annotator-ui";
import type { AlignerDataPort, AnnotatorDataPort } from "@lisca/client/ports/types";
import { createCanvasResourceTransaction } from "@lisca/instrument";
import type { FrameResult } from "@lisca/utils";
import { normalizeAlignDrift, normalizeAlignGridState } from "@lisca/utils";
import { Effect } from "effect";
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { waitForCondition } from "./render-helper";

function makeFrame(pixelValue: number, suggestedMax = 200): FrameResult {
  return {
    width: 4,
    height: 4,
    pixels: new Uint8Array(16).fill(pixelValue),
    contrastDomain: { min: 0, max: 255 },
    suggestedContrast: { min: 10, max: suggestedMax },
  };
}

const disposers: Array<() => void> = [];

describe("contrast lock + frame navigation race regressions", () => {
  beforeEach(() => {
    clearRoiFrameCache();
  });

  afterEach(() => {
    while (disposers.length > 0) {
      disposers.pop()?.();
    }
  });

  it("settles annotationLoading and resets annotation when stepping time with Contrast Locked from default null contrast", async () => {
    const registry = AtomRegistry.make();
    disposers.push(() => registry.dispose());

    const uiAtom = Atom.make(createInitialAnnotatorUiState()).pipe(Atom.keepAlive);
    const uiActions = createAnnotatorUiActions({ write: () => undefined });
    const roiScan: RoiWorkspaceScan = {
      positions: [
        {
          pos: 0,
          channels: [0],
          times: [0, 1, 2],
          zSlices: [0],
          rois: [{ roi: 1, fileName: "roi_1.tif", bbox: { roi: 1, x: 0, y: 0, w: 4, h: 4 } }],
        },
      ],
    };
    const labels: readonly AnnotationLabel[] = [{ id: "live", name: "Live", color: "#22c55e" }];
    const scanAtom = Atom.make(AsyncResult.success<RoiWorkspaceScan, unknown>(roiScan)).pipe(
      Atom.keepAlive,
    );
    const labelsAtom = Atom.make(
      AsyncResult.success<readonly AnnotationLabel[], unknown>(labels),
    ).pipe(Atom.keepAlive);
    const saveLabelsAtom = Atom.fn((input: { workspacePath: string; labels: AnnotationLabel[] }) =>
      Effect.succeed(input.labels as readonly AnnotationLabel[]),
    );
    const saveAnnAtom = Atom.fn(
      (_input: {
        workspacePath: string;
        request: RoiFrameRequest;
        annotation: { classificationLabelId: string | null; maskBase64Png: string | null };
      }) => Effect.succeed({ ok: true }),
    );

    const loadRoiFrameCalls: Array<{
      time: number;
      contrast: { min: number; max: number } | null;
    }> = [];
    const client = {
      loadRoiFrame: (
        _ws: string,
        req: RoiFrameRequest,
        contrast: { min: number; max: number } | null,
      ) =>
        Effect.sync(() => {
          loadRoiFrameCalls.push({ time: req.time, contrast });
          return makeFrame(req.time + 1, 180);
        }),
      loadRoiFrameAnnotation: (_ws: string, req: RoiFrameRequest) =>
        Effect.succeed({
          annotation: {
            classificationLabelId: req.time === 1 ? "live" : null,
            maskPath: null,
            updatedAt: null,
          },
          maskBase64Png: null,
        }),
    } as unknown as AnnotatorDataPort;

    const controller = createAnnotateSessionController({
      registry,
      annotatorClient: client,
      toErrorMessage: (cause, fallback) => (cause instanceof Error ? cause.message : fallback),
      annotatorUiAtom: uiAtom,
      annotatorUiActions: uiActions,
      roiWorkspaceScanAtom: () => scanAtom,
      roiScanIdleAtom: scanAtom,
      annotationLabelsAtom: () => labelsAtom,
      labelsIdleAtom: labelsAtom,
      saveAnnotationLabelsAtom: saveLabelsAtom,
      saveRoiFrameAnnotationAtom: saveAnnAtom,
      workspace: {
        getWorkspacePath: () => "/ws",
        setWorkspacePath: () => undefined,
      },
      transact: createCanvasResourceTransaction(),
      guardDirtySelection: () => true,
    });
    disposers.push(() => controller.dispose());

    await waitForCondition(() => controller.getState().canEdit);
    expect(controller.getState().frameLoading).toBe(false);
    expect(controller.getState().annotationLoading).toBe(false);
    expect(controller.getState().contrast).toBeNull();
    expect(loadRoiFrameCalls).toEqual([{ time: 0, contrast: null }]);

    // User locks contrast while contrast === null, then steps to frame 1.
    controller.getState().setContrastLocked(true);
    controller
      .getState()
      .changeSelection(() => controller.getState().setSelection({ timeIndex: 1 }));

    await waitForCondition(
      () => controller.getState().annotation.current.classificationLabelId === "live",
    );
    expect(controller.getState().selection.timeIndex).toBe(1);
    expect(controller.getState().contrast).toEqual({ min: 10, max: 180 });
    expect(controller.getState().frameLoading).toBe(false);
    expect(controller.getState().annotationLoading).toBe(false);
    expect(controller.getState().canEdit).toBe(true);
    expect(loadRoiFrameCalls).toEqual([
      { time: 0, contrast: null },
      { time: 1, contrast: { min: 10, max: 180 } },
    ]);

    // Rapid synchronous frame steps when clean do not drop steps.
    controller
      .getState()
      .changeSelection(() =>
        controller
          .getState()
          .setSelection({ timeIndex: controller.getState().selection.timeIndex - 1 }),
      );
    controller
      .getState()
      .changeSelection(() =>
        controller
          .getState()
          .setSelection({ timeIndex: controller.getState().selection.timeIndex + 2 }),
      );
    expect(controller.getState().selection.timeIndex).toBe(2);
    await waitForCondition(() => !controller.getState().annotationLoading);
    expect(controller.getState().canEdit).toBe(true);
  });

  it("applies savedAlignState and settles frameLoading when switching position with Contrast Locked from null contrast, and warns on unpinned drift pan", async () => {
    const registry = AtomRegistry.make();
    disposers.push(() => registry.dispose());

    const uiAtom = Atom.make(createInitialAlignUiState()).pipe(Atom.keepAlive);
    const uiActions = createAlignUiActions(
      { write: () => undefined, read: () => null },
      {
        clearSourceOnWorkspaceChange: false,
        preserveSelectionOnScan: true,
        skipRedundantSourceSet: true,
        includeApplySavedAlignState: true,
      },
    );
    const source: AlignerSource = { kind: "nd2", path: "/data/acq.nd2" };
    const scanData: WorkspaceScan = {
      positions: [0, 1],
      channels: [0],
      times: [0, 10, 20],
      zSlices: [0],
    };
    const scanAtom = Atom.make(AsyncResult.success<WorkspaceScan, unknown>(scanData)).pipe(
      Atom.keepAlive,
    );
    const loadFrameCalls: Array<{ pos: number; contrast: { min: number; max: number } | null }> =
      [];
    const savedPos1: SavedAlignState = {
      grid: normalizeAlignGridState({ tx: 42, ty: 24, enabled: true }),
      excludedPatterns: [{ i: 1, j: 2 }],
      drift: normalizeAlignDrift({
        referenceTime: 0,
        interpolation: "linear",
        keyframes: [{ time: 20, dx: 6, dy: -2 }],
      })!,
    };

    const client = {
      loadAlignState: (_ws: string, pos: number) => Effect.succeed(pos === 1 ? savedPos1 : null),
    } as unknown as AlignerDataPort;

    const controller = createAlignSessionController({
      registry,
      store: { atom: uiAtom, actions: uiActions },
      backend: {
        client,
        loadFrame: (_backend, _src, selection, contrast) =>
          Effect.sync(() => {
            loadFrameCalls.push({ pos: selection.pos, contrast });
            return makeFrame(selection.pos + 10, 210);
          }),
        toErrorMessage: (_cause, fallback) => fallback,
        frameErrorMessage: () => "frame error",
      },
      resources: { transact: createCanvasResourceTransaction() },
      scan: { forSource: () => scanAtom, idle: scanAtom },
      policy: {
        workspacePath: () => "/ws",
        source: () => source,
      },
      assayDefaultTime: () => 0,
    });
    disposers.push(() => controller.dispose());

    await waitForCondition(() => registry.get(uiAtom).loadedFrameSelection?.pos === 0);
    expect(controller.getState().frameLoading).toBe(false);
    expect(loadFrameCalls).toEqual([{ pos: 0, contrast: null }]);

    controller.getState().setContrastLocked(true);
    controller.getState().setSelection({ pos: 1, time: 10 });

    await waitForCondition(() => registry.get(uiAtom).loadedFrameSelection?.pos === 1);
    expect(controller.getState().frameLoading).toBe(false);
    expect(controller.getState().contrast).toEqual({ min: 10, max: 210 });
    expect(controller.getState().grid.tx).toBe(42);
    expect(controller.getState().currentExcludedPatterns).toEqual([{ i: 1, j: 2 }]);
    expect(loadFrameCalls).toEqual([
      { pos: 0, contrast: null },
      { pos: 1, contrast: { min: 10, max: 210 } },
    ]);

    // Panning on time=10 (unpinned between reference 0 and pin 20) surfaces clear guidance.
    const shown = controller.getState().effectiveGrid;
    controller.getState().commitCanvas({ ...shown, tx: shown.tx + 5 }, "offset", shown);
    expect(controller.getState().status).toContain("Pin a keyframe");
  });
});
