import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCanvasThemeRerender } from "../src/features/canvas/canvas-theme";
import { ShellThemeProvider } from "../src/shell/theme/shell-theme";

let notifyMutation: MutationCallback;

class TestMutationObserver {
  constructor(callback: MutationCallback) {
    notifyMutation = callback;
  }
  observe() {}
  disconnect() {}
  takeRecords(): MutationRecord[] {
    return [];
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("canvas theme lifecycle", () => {
  it("coalesces mutation redraws and cancels queued work on cleanup", () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    vi.stubGlobal("MutationObserver", TestMutationObserver);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const id = ++nextFrame;
      callbacks.set(id, callback);
      return id;
    });
    const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      callbacks.delete(id);
    });
    const rerender = vi.fn();

    function Probe() {
      useCanvasThemeRerender(rerender);
      return null;
    }

    const view = render(() => (
      <ShellThemeProvider storageKey="canvas-theme-lifecycle-test">
        <Probe />
      </ShellThemeProvider>
    ));

    notifyMutation([], {} as MutationObserver);
    notifyMutation([], {} as MutationObserver);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);

    view.unmount();
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(callbacks.size).toBe(0);
  });
});
