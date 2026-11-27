import type { AnnotationLabel, RoiWorkspaceScan } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { AsyncResult } from "effect/reactivity";
import { describe, expect, it } from "vite-plus/test";

import {
  createAnnotatorUiActions,
  createInitialAnnotatorUiState,
  type AnnotatorUiState,
  type StateUpdater,
} from "../src/atoms/annotator-ui";
import { createAnnotateSessionCore } from "../src/session/annotate-session-controller";

const WORKSPACE = "/ws";

const scanData: RoiWorkspaceScan = {
  positions: [
    {
      pos: 1,
      channels: [0],
      times: [10],
      zSlices: [0],
      rois: [{ roi: 1, fileName: "roi.tif", bbox: { roi: 1, x: 0, y: 0, w: 64, h: 64 } }],
    },
  ],
};

const labels: readonly AnnotationLabel[] = [{ id: "a", name: "A", color: "#ff0000" }];

const scanSuccess = (): AsyncResult.AsyncResult<RoiWorkspaceScan, unknown> =>
  AsyncResult.success<RoiWorkspaceScan>(scanData);
const scanFailure = (message: string): AsyncResult.AsyncResult<RoiWorkspaceScan, unknown> =>
  AsyncResult.fail<Error, RoiWorkspaceScan>(new Error(message));
const labelsSuccess = (): AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown> =>
  AsyncResult.success<readonly AnnotationLabel[]>(labels);
const labelsFailure = (
  message: string,
): AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown> =>
  AsyncResult.fail<Error, readonly AnnotationLabel[]>(new Error(message));

function makeFrame(value: number): FrameResult {
  const size = 8;
  return {
    width: size,
    height: size,
    pixels: new Uint8Array(size * size).fill(value),
    contrastDomain: { min: 0, max: 255 },
    suggestedContrast: { min: 0, max: value },
  };
}

type MountConfig = {
  scan: AsyncResult.AsyncResult<RoiWorkspaceScan, unknown>;
  labels: AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown>;
  frame?: FrameResult | null;
  initialTimeIndex?: "first" | "last";
};

function mountSession(config: MountConfig) {
  const actions = createAnnotatorUiActions<AnnotatorUiState>({ write: () => undefined });
  let state: AnnotatorUiState = {
    ...createInitialAnnotatorUiState(),
    workspacePath: WORKSPACE,
    selection: { pos: 1, roi: 1, channel: 0, timeIndex: 0, zIndex: 0 },
    frame: config.frame ?? null,
  };
  let scanResult = config.scan;
  let labelsResult = config.labels;

  const setUi = (update: StateUpdater<AnnotatorUiState>) => {
    state = typeof update === "function" ? update(state) : update;
  };

  const session = createAnnotateSessionCore({
    getUi: () => state,
    setUi,
    actions,
    workspace: { getWorkspacePath: () => WORKSPACE, setWorkspacePath: () => undefined },
    getScanResult: () => scanResult,
    getLabelsResult: () => labelsResult,
    toErrorMessage: (cause) =>
      typeof cause === "string" ? cause : ((cause as Error)?.message ?? String(cause)),
    initialTimeIndex: config.initialTimeIndex,
  });

  session.sync();

  const commitFrame = (frame: FrameResult): void => {
    actions.setFrame(setUi, frame);
    actions.setContrastState(setUi, frame);
    actions.setStatus(setUi, "Loaded Pos1 Roi1");
    session.sync();
  };

  return {
    state: () => state,
    setUi,
    actions,
    chooseTime: (timeIndex: number) => {
      session.actions.setSelection({ timeIndex });
      session.sync();
    },
    commitFrame,
    setScanResult: (next: AsyncResult.AsyncResult<RoiWorkspaceScan, unknown>) => {
      scanResult = next;
      session.sync();
    },
    setLabelsResult: (next: AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown>) => {
      labelsResult = next;
      session.sync();
    },
    sync: () => session.sync(),
  };
}

describe("createAnnotateSessionCore — scan-error sync (Effect 5 regression)", () => {
  it("does not re-wipe a committed frame while labels fail", () => {
    const handles = mountSession({
      scan: scanSuccess(),
      labels: labelsFailure("labels boom"),
      frame: makeFrame(7),
    });

    expect(handles.state().frame).toBeNull();
    expect(handles.state().scanError).toContain("labels boom");

    handles.commitFrame(makeFrame(9));

    expect(handles.state().frame).not.toBeNull();
    expect(handles.state().frame).toEqual(makeFrame(9));
    expect(handles.state().scanError).toContain("labels boom");
  });

  it("restores the canvas in one commit after labels recover", () => {
    const handles = mountSession({
      scan: scanSuccess(),
      labels: labelsFailure("labels boom"),
      frame: makeFrame(7),
    });

    expect(handles.state().frame).toBeNull();

    handles.setLabelsResult(labelsSuccess());
    expect(handles.state().frame).toBeNull();

    handles.commitFrame(makeFrame(11));
    expect(handles.state().frame).not.toBeNull();
    expect(handles.state().frame).toEqual(makeFrame(11));
  });

  it("does not replace a later status when the scan is already loaded", () => {
    const handles = mountSession({
      scan: scanSuccess(),
      labels: labelsSuccess(),
      frame: makeFrame(7),
    });

    expect(handles.state().status).toBe("ROI workspace loaded");

    handles.commitFrame(makeFrame(9));
    handles.actions.setSelection(handles.setUi, { timeIndex: 0 });
    handles.actions.setStatus(handles.setUi, "Saved ROI annotation");
    handles.sync();

    expect(handles.state().status).toBe("Saved ROI annotation");
    expect(handles.state().frame).toEqual(makeFrame(9));
  });

  it("still wipes the frame and sets scanError on a genuine scan failure", () => {
    const handles = mountSession({
      scan: scanSuccess(),
      labels: labelsSuccess(),
      frame: makeFrame(7),
    });

    handles.commitFrame(makeFrame(12));
    expect(handles.state().frame).not.toBeNull();
    expect(handles.state().scanError).toBeNull();

    handles.setScanResult(scanFailure("scan boom"));
    expect(handles.state().frame).toBeNull();
    expect(handles.state().scanError).toContain("scan boom");
  });
});

describe("createAnnotateSessionCore — initial time", () => {
  const timedScan: RoiWorkspaceScan = {
    positions: [
      {
        pos: 1,
        channels: [0],
        times: [10, 20, 30],
        zSlices: [0],
        rois: [{ roi: 1, fileName: "roi.tif", bbox: { roi: 1, x: 0, y: 0, w: 64, h: 64 } }],
      },
    ],
  };

  it("opens on the last frame when asked and keeps an explicit frame 0", () => {
    const handles = mountSession({
      scan: AsyncResult.success(timedScan),
      labels: labelsSuccess(),
      initialTimeIndex: "last",
    });

    expect(handles.state().selection.timeIndex).toBe(2);
    handles.chooseTime(0);
    expect(handles.state().selection.timeIndex).toBe(0);
  });
});
