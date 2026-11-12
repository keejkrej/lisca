import type {
  AlignerSource,
  AnnotationLabel,
  RoiFrameRequest,
  RoiWorkspaceScan,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { normalizeAlignDrift, normalizeAlignGridState } from "@lisca/utils";
import { RegistryProvider } from "@effect/atom-solid";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { Effect } from "effect";
import { cleanup, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { createAlignUiActions, createInitialAlignUiState } from "@lisca/client/atoms/align-ui";
import {
  createAnnotatorUiActions,
  createInitialAnnotatorUiState,
} from "@lisca/client/atoms/annotator-ui";
import { useCanvasResourceTransaction } from "@lisca/instrument";
import { clearRoiFrameCache, useAnnotateStateCore } from "@lisca/client/use-annotate-state-core";
import type { AlignerDataPort, AnnotatorDataPort } from "@lisca/client/ports/types";
import { useAlignSessionCore } from "@lisca/client/align-session/solid";

function makeFrame(pixelValue: number, suggestedMax = 200): FrameResult {
  return {
    width: 4,
    height: 4,
    pixels: new Uint8Array(16).fill(pixelValue),
    contrastDomain: { min: 0, max: 255 },
    suggestedContrast: { min: 10, max: suggestedMax },
  };
}

describe("contrast lock + frame navigation race regressions", () => {
  beforeEach(() => {
    clearRoiFrameCache();
  });

  afterEach(() => {
    cleanup();
  });

  it("settles annotationLoading and resets annotation when stepping time with Contrast Locked from default null contrast", async () => {
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

    let annotate!: ReturnType<typeof useAnnotateStateCore>;
    function Probe() {
      annotate = useAnnotateStateCore({
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
        useShellWorkspace: () => ({
          workspacePath: "/ws",
          setWorkspacePath: () => undefined,
        }),
        useCanvasResourceTransaction,
        useCanvasTransientStatus: (status) => status,
        guardDirtySelection: () => true,
      });
      return null;
    }

    render(() => (
      <RegistryProvider>
        <Probe />
      </RegistryProvider>
    ));

    await waitFor(() => expect(annotate().canEdit).toBe(true));
    expect(annotate().frameLoading).toBe(false);
    expect(annotate().annotationLoading).toBe(false);
    expect(annotate().contrast).toBeNull();
    expect(loadRoiFrameCalls).toEqual([{ time: 0, contrast: null }]);

    // User locks contrast while contrast === null, then steps to frame 1.
    annotate().setContrastLocked(true);
    annotate().changeSelection(() => annotate().setSelection({ timeIndex: 1 }));

    await waitFor(() => expect(annotate().annotation.current.classificationLabelId).toBe("live"));
    expect(annotate().selection.timeIndex).toBe(1);
    expect(annotate().contrast).toEqual({ min: 10, max: 180 });
    expect(annotate().frameLoading).toBe(false);
    expect(annotate().annotationLoading).toBe(false);
    expect(annotate().canEdit).toBe(true);
    expect(loadRoiFrameCalls).toEqual([
      { time: 0, contrast: null },
      { time: 1, contrast: { min: 10, max: 180 } },
    ]);

    // Rapid synchronous frame steps when clean do not drop steps.
    annotate().changeSelection(() =>
      annotate().setSelection({ timeIndex: annotate().selection.timeIndex - 1 }),
    );
    annotate().changeSelection(() =>
      annotate().setSelection({ timeIndex: annotate().selection.timeIndex + 2 }),
    );
    expect(annotate().selection.timeIndex).toBe(2);
    await waitFor(() => expect(annotate().annotationLoading).toBe(false));
    expect(annotate().canEdit).toBe(true);
  });

  it("applies savedAlignState and settles frameLoading when switching position with Contrast Locked from null contrast, and warns on unpinned drift pan", async () => {
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

    let session!: ReturnType<typeof useAlignSessionCore>;
    function Probe() {
      session = useAlignSessionCore({
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
        resources: { transact: useCanvasResourceTransaction() },
        scan: { forSource: () => scanAtom, idle: scanAtom },
        policy: {
          workspacePath: () => "/ws",
          source: () => source,
        },
        assayDefaultTime: () => 0,
      });
      return null;
    }

    render(() => (
      <RegistryProvider>
        <Probe />
      </RegistryProvider>
    ));

    await waitFor(() => expect(session.state().loadedFrameSelection?.pos).toBe(0));
    expect(session.state().frameLoading).toBe(false);
    expect(loadFrameCalls).toEqual([{ pos: 0, contrast: null }]);

    session.actions.setContrastLocked(true);
    session.actions.setSelection({ pos: 1, time: 10 });

    await waitFor(() => expect(session.state().loadedFrameSelection?.pos).toBe(1));
    expect(session.state().frameLoading).toBe(false);
    expect(session.state().contrast).toEqual({ min: 10, max: 210 });
    expect(session.state().grid.tx).toBe(42);
    expect(session.derived().currentExcludedPatterns).toEqual([{ i: 1, j: 2 }]);
    expect(loadFrameCalls).toEqual([
      { pos: 0, contrast: null },
      { pos: 1, contrast: { min: 10, max: 210 } },
    ]);

    // Panning on time=10 (unpinned between reference 0 and pin 20) surfaces clear guidance.
    const shown = session.derived().effectiveGrid;
    session.commitCanvas({ ...shown, tx: shown.tx + 5 }, "offset", shown);
    expect(session.state().status).toContain("Pin a keyframe");
  });
});
