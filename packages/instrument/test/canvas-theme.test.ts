import { UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { ShellThemeProvider } from "@lisca/ui/shell";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { canvasThemeRerenderSubscription } from "../src/canvas/canvas-theme";
import { cleanupMounted, flushMicrotasks, mountTest } from "./render-helper";

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

afterEach(async () => {
  await cleanupMounted();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("canvas theme lifecycle", () => {
  it("coalesces mutation redraws and cancels queued work on cleanup", async () => {
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

    const ProbeMsg = UiSchema.TaggedEnum({ Redraw: {} });

    const Probe = Html.component({
      name: "CanvasThemeProbe",
      props: Schema.Struct({ themeMode: Schema.String }),
      model: Schema.Struct({}),
      message: ProbeMsg,
    }).make({
      init: () => ({}),
      update: {
        Redraw: ($) => {
          rerender();
          return $.model;
        },
      },
      subscriptions: ({ props }) => [
        canvasThemeRerenderSubscription("canvas-theme-probe", props.themeMode, ProbeMsg.Redraw()),
      ],
      view: () => View.text(""),
    });

    const Host = Html.component({
      name: "CanvasThemeTestHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: {},
      view: (h) =>
        ShellThemeProvider(h, {
          props: { storageKey: "canvas-theme-lifecycle-test" },
          view: (theme) => Probe(h, { props: { themeMode: theme.mode } }),
        }),
    });

    const view = await mountTest(Host, {});
    await flushMicrotasks();

    notifyMutation([], {} as MutationObserver);
    notifyMutation([], {} as MutationObserver);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);

    await view.unmount();
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(callbacks.size).toBe(0);
  });
});
