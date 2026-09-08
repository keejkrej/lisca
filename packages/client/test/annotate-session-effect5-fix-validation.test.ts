import type { AnnotationLabel, RoiWorkspaceScan } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { AsyncResult } from "effect/unstable/reactivity";
import { describe, expect, it, vi } from "vitest";

// packages/client tests run under vitest's node environment without
// vite-plugin-solid, so the bare "solid-js" specifier resolves to the SSR
// build (./dist/server.js) where createEffect is a no-op. The `vi.mock`
// below forces the re-active dev build so useAnnotateSessionCore's
// createEffect actually fires under test — the production-identical
// reactivity core that the bug relies on.
vi.mock("solid-js", async () => {
  const dev = await vi.importActual<typeof import("solid-js")>("solid-js/dist/dev.js");
  return { ...dev };
});

import { createRoot, createSignal, type Accessor } from "solid-js";

import {
  createAnnotatorUiActions,
  createInitialAnnotatorUiState,
  type AnnotatorUiState,
  type StateUpdater,
} from "../src/atoms/annotator-ui";
import {
  useAnnotateSessionCore,
  type AnnotateScanAtoms,
} from "../src/session/use-annotate-session";

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

async function flush(remaining = 20): Promise<void> {
  if (remaining <= 0) return;
  await Promise.resolve();
  await flush(remaining - 1);
}

type SessionHandles = {
  state: Accessor<AnnotatorUiState>;
  setUi: (update: StateUpdater<AnnotatorUiState>) => void;
  actions: ReturnType<typeof createAnnotatorUiActions>;
  commitFrame: (frame: FrameResult) => void;
  setScanResult: (next: AsyncResult.AsyncResult<RoiWorkspaceScan, unknown>) => void;
  setLabelsResult: (next: AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown>) => void;
  dispose: () => void;
};

type MountConfig = {
  scan: AsyncResult.AsyncResult<RoiWorkspaceScan, unknown>;
  labels: AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown>;
  frame?: FrameResult | null;
};

function mountSession(config: MountConfig): SessionHandles {
  const actions = createAnnotatorUiActions<AnnotatorUiState>({ write: () => undefined });
  const initial: AnnotatorUiState = {
    ...createInitialAnnotatorUiState(),
    workspacePath: WORKSPACE,
    selection: { pos: 1, roi: 1, channel: 0, timeIndex: 0, zIndex: 0 },
    frame: config.frame ?? null,
  };
  const [ui, setUiSignal] = createSignal<AnnotatorUiState>(initial);
  const setUi = setUiSignal as (update: StateUpdater<AnnotatorUiState>) => void;
  const [scanResult, setScanResult] = createSignal(config.scan);
  const [labelsResult, setLabelsResult] = createSignal(config.labels);
  const shellWorkspacePath = (): string | null => WORKSPACE;
  const scan: AnnotateScanAtoms = { scanResult, labelsResult, shellWorkspacePath };

  let state!: Accessor<AnnotatorUiState>;
  const dispose = createRoot((rootDispose) => {
    const session = useAnnotateSessionCore({
      ui,
      setUi,
      actions,
      workspace: { workspacePath: WORKSPACE, setWorkspacePath: () => undefined },
      scan,
      toErrorMessage: (cause) =>
        typeof cause === "string" ? cause : ((cause as Error)?.message ?? String(cause)),
    });
    state = session.state;
    return rootDispose;
  });

  // Reproduces the production frame-load `commit` shape
  // (use-annotate-state-core.ts: "setFrame | setContrastState | setStatus"),
  // the UI writes that previously re-triggered the scan-error effect.
  const commitFrame = (frame: FrameResult): void => {
    actions.setFrame(setUi, frame);
    actions.setContrastState(setUi, frame);
    actions.setStatus(setUi, `Loaded Pos1 Roi1`);
  };

  return { state, setUi, actions, commitFrame, setScanResult, setLabelsResult, dispose };
}

describe("useAnnotateSessionCore — scan-error effect (Effect 5)", () => {
  it("does not re-wipe a committed frame while labels fail (regression)", async () => {
    const handles = mountSession({
      scan: scanSuccess(),
      labels: labelsFailure("labels boom"),
      frame: makeFrame(7),
    });
    try {
      // Initial labels failure wipes the previously-loaded frame and surfaces
      // a scan-level error (unchanged React-era behaviour).
      await flush();
      expect(handles.state().frame).toBeNull();
      expect(handles.state().scanError).toContain("labels boom");

      // A frame-load commit (selection change / contrast nudge reload) writes
      // a fresh frame to the UI atom — the writes that re-triggered the
      // whole-UI-subscribed scan-error effect under the buggy source.
      handles.commitFrame(makeFrame(9));
      await flush();

      // Patched: Effect 5 no longer subscribes to the UI atom, so the
      // committed frame survives; the labels error toast remains.
      expect(handles.state().frame).not.toBeNull();
      expect(handles.state().frame).toEqual(makeFrame(9));
      expect(handles.state().scanError).toContain("labels boom");
    } finally {
      handles.dispose();
    }
  });

  it("restores the canvas in one commit after labels recover", async () => {
    const handles = mountSession({
      scan: scanSuccess(),
      labels: labelsFailure("labels boom"),
      frame: makeFrame(7),
    });
    try {
      await flush();
      expect(handles.state().frame).toBeNull();

      // Fixing the labels flips labelsResult back to Success; Effect 5
      // re-runs (it still tracks labelsResult), sees no error, and
      // early-returns — it does not auto-reload the frame.
      handles.setLabelsResult(labelsSuccess());
      await flush();
      expect(handles.state().frame).toBeNull();

      // A single user reload action (selection change / contrast nudge)
      // commits a fresh frame; Effect 5 is dormant (no error, and it no
      // longer subscribes to the UI atom), so the canvas stays visible.
      handles.commitFrame(makeFrame(11));
      await flush();
      expect(handles.state().frame).not.toBeNull();
      expect(handles.state().frame).toEqual(makeFrame(11));
    } finally {
      handles.dispose();
    }
  });

  it("still wipes the frame and sets scanError on a genuine scan failure", async () => {
    const handles = mountSession({
      scan: scanSuccess(),
      labels: labelsSuccess(),
      frame: makeFrame(7),
    });
    try {
      // A frame is committed while both scan and labels succeed.
      handles.commitFrame(makeFrame(12));
      await flush();
      expect(handles.state().frame).not.toBeNull();
      expect(handles.state().scanError).toBeNull();

      // The scan fails (frame source is gone): Effect 5 still tracks
      // scanResult, so it wipes the frame and surfaces a scan-level error.
      handles.setScanResult(scanFailure("scan boom"));
      await flush();
      expect(handles.state().frame).toBeNull();
      expect(handles.state().scanError).toContain("scan boom");
    } finally {
      handles.dispose();
    }
  });
});
