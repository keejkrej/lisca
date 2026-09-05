import { createRoot, type Accessor } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import type { FrameResult } from "@lisca/utils";

import * as browser from "../src/browser";
import {
  useDemoAnnotatorState,
  type DemoAnnotatorState,
} from "../src/hooks/use-demo-annotator-state";

// `vi.mock` is hoisted above the imports below: the hook (and this test) both
// observe the same mocked `loadImageFile` from `../src/browser`. Everything
// else in the browser module stays real via `importOriginal`.
vi.mock("../src/browser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/browser")>();
  return { ...actual, loadImageFile: vi.fn() };
});

const FRAME_A: FrameResult = {
  width: 4,
  height: 4,
  pixels: new Uint16Array(16),
};

const LOADED_A = { frame: FRAME_A, format: { kind: "png" } as const };

// `demoAnnotatorUiAtom` is a module-level Atom piped through `Atom.keepAlive`.
// vitest gives each test file a fresh module instance, so the atom starts at
// `createInitialDemoAnnotatorUiState()` for this file. This file has a single
// `it` so no earlier test can have mutated the shared atom.

describe("useDemoAnnotatorState openImage confirm gating", () => {
  it("does not prompt a second time to discard edits after a failed image load", async () => {
    const loadImageFileMock = vi.mocked(browser.loadImageFile);
    loadImageFileMock.mockReset();
    // load A (success) -> commit edit (dirty=true) -> open B (fails) -> open C (success)
    loadImageFileMock
      .mockResolvedValueOnce(LOADED_A)
      .mockRejectedValueOnce(new Error("decode failed"))
      .mockResolvedValueOnce(LOADED_A);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    let state: Accessor<DemoAnnotatorState> | undefined;
    let dispose: (() => void) | undefined;
    createRoot((d) => {
      dispose = d;
      state = useDemoAnnotatorState();
    });
    try {
      expect(state).toBeDefined();

      // 1. Load image A. No prior dirty state, so confirm must NOT be asked.
      await state!().openImage(new File([], "a.png"));
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(state!().frame).toBe(FRAME_A);
      expect(state!().fileName).toBe("a.png");
      expect(state!().annotation.dirty).toBe(false);

      // 2. Commit an edit so the annotation becomes dirty.
      state!().annotation.commit({
        classificationLabelId: "class-1",
        mask: new Uint8Array(FRAME_A.width * FRAME_A.height).fill(1),
      });
      expect(state!().annotation.dirty).toBe(true);

      // 3. Open image B, which fails to decode. The dirty gate legitimately
      //    asks once to discard the unsaved edits, then the load fails and
      //    clearLoadedImage runs.
      await state!().openImage(new File([], "b.png"));
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenLastCalledWith("Discard unsaved annotation changes?");
      expect(state!().frame).toBeNull();
      expect(state!().fileName).toBeNull();
      expect(state!().error).toBe("decode failed");

      // Regression: after a failed load there is no frame, so the annotation
      // invariant `frame === null => dirty === false` must hold. Before the
      // fix, dirty stayed true (edits belonging to a frame that no longer
      // exists) and the next openImage re-prompted.
      expect(state!().annotation.dirty).toBe(false);
      expect(state!().annotation.current.mask).toEqual(new Uint8Array());

      // 4. Open image C. Because dirty is now false, the gate must NOT ask
      //    again. Before the fix this was the spurious second confirm.
      await state!().openImage(new File([], "c.png"));
      expect(state!().frame).toBe(FRAME_A);
      expect(state!().fileName).toBe("c.png");
      expect(state!().annotation.dirty).toBe(false);
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    } finally {
      dispose?.();
    }
  });
});
