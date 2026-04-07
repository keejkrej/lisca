import { afterEach, describe, expect, test } from "bun:test";
import { clearMocks, mockIPC, mockWindows } from "@tauri-apps/api/mocks";

import { createTauriDesktopPorts } from "../../../src/viewer/host-tauri";

const CROP_PROGRESS_EVENT = "viewer://crop-progress";

type MockEventPluginPayload = {
  handler?: number;
};

type MockTauriWindow = Window &
  typeof globalThis & {
    __TAURI_INTERNALS__: {
      runCallback: (id: number, event: unknown) => void;
    };
  };

if (typeof window === "undefined") {
  (globalThis as typeof globalThis & { window: Window & typeof globalThis }).window =
    globalThis as unknown as Window & typeof globalThis;
}

function emitMockEvent(handlerId: number, payload: unknown) {
  (window as MockTauriWindow).__TAURI_INTERNALS__.runCallback(handlerId, {
    event: CROP_PROGRESS_EVENT,
    id: handlerId,
    payload,
  });
}

function eventPayload(value: unknown): MockEventPluginPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as MockEventPluginPayload;
}

afterEach(() => {
  clearMocks();
});

describe("tauri crop progress bridge", () => {
  test("delivers crop progress events through the current webview window listener", async () => {
    mockWindows("main");

    const handlerIds: number[] = [];
    mockIPC((cmd, payload) => {
      const eventArgs = eventPayload(payload);
      switch (cmd) {
        case "plugin:event|listen":
          if (typeof eventArgs.handler === "number") {
            handlerIds.push(eventArgs.handler);
            return eventArgs.handler;
          }
          return null;
        case "crop_roi":
          return { ok: true };
        default:
          return null;
      }
    });

    const ports = createTauriDesktopPorts();
    const received: Array<{ requestId: string; progress: number; message: string }> = [];

    const unlisten = ports.dataPort.onCropRoiProgress((event) => {
      received.push(event);
    });

    await ports.dataPort.cropRoi(
      "/tmp/workspace",
      { kind: "tif", path: "/tmp/source" },
      3,
      "tiff",
    );

    expect(handlerIds).toHaveLength(1);

    emitMockEvent(handlerIds[0], {
      request_id: "req-1",
      progress: 0.5,
      message: "Writing ROI planes",
    });

    expect(received).toEqual([
      {
        requestId: "req-1",
        progress: 0.5,
        message: "Writing ROI planes",
      },
    ]);

    unlisten();
  });

  test("retries crop progress listener registration after an initial failure", async () => {
    mockWindows("main");

    let listenAttempts = 0;
    let registeredHandlerId: number | null = null;
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      mockIPC((cmd, payload) => {
        const eventArgs = eventPayload(payload);
        switch (cmd) {
          case "plugin:event|listen":
            listenAttempts += 1;
            if (listenAttempts === 1) {
              throw new Error("listen failed");
            }
            if (typeof eventArgs.handler === "number") {
              registeredHandlerId = eventArgs.handler;
              return eventArgs.handler;
            }
            return null;
          case "crop_roi":
            return { ok: true };
          default:
            return null;
        }
      });

      const ports = createTauriDesktopPorts();
      const received: Array<{ requestId: string; progress: number; message: string }> = [];

      ports.dataPort.onCropRoiProgress((event) => {
        received.push(event);
      });

      await ports.dataPort.cropRoi(
        "/tmp/workspace",
        { kind: "tif", path: "/tmp/source" },
        1,
        "tiff",
      );
      await ports.dataPort.cropRoi(
        "/tmp/workspace",
        { kind: "tif", path: "/tmp/source" },
        1,
        "tiff",
      );

      expect(listenAttempts).toBe(2);
      expect(registeredHandlerId).not.toBeNull();

      if (registeredHandlerId == null) {
        throw new Error("Expected crop progress listener to be registered");
      }

      emitMockEvent(registeredHandlerId, {
        request_id: "req-2",
        progress: 0.75,
        message: "Writing ROI index",
      });

      expect(received).toEqual([
        {
          requestId: "req-2",
          progress: 0.75,
          message: "Writing ROI index",
        },
      ]);
    } finally {
      console.error = originalConsoleError;
    }
  });
});
