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

describe("tauri align state bridge", () => {
  test("forwards align state payload when saving bbox data", async () => {
    mockWindows("main");

    let savedPayload: unknown = null;
    mockIPC((cmd, payload) => {
      if (cmd === "save_bbox") {
        savedPayload = payload;
        return { ok: true };
      }
      return null;
    });

    const ports = createTauriDesktopPorts();
    await ports.dataPort.saveBbox(
      "/tmp/workspace",
      { kind: "tif", path: "/tmp/source" },
      7,
      "roi,x,y,w,h\n0,0,0,1,1\n",
      {
        grid: {
          enabled: true,
          shape: "square",
          tx: 1,
          ty: 2,
          rotation: 0.3,
          spacingA: 100,
          spacingB: 120,
          cellWidth: 80,
          cellHeight: 90,
          opacity: 0.4,
        },
        excludedCells: [{ i: 3, j: 4 }],
      },
    );

    expect(savedPayload).toEqual({
      workspacePath: "/tmp/workspace",
      source: { kind: "tif", path: "/tmp/source" },
      pos: 7,
      csv: "roi,x,y,w,h\n0,0,0,1,1\n",
      alignState: {
        grid: {
          enabled: true,
          shape: "square",
          tx: 1,
          ty: 2,
          rotation: 0.3,
          spacingA: 100,
          spacingB: 120,
          cellWidth: 80,
          cellHeight: 90,
          opacity: 0.4,
        },
        excludedCells: [{ i: 3, j: 4 }],
      },
    });
  });

  test("loads align state for a position", async () => {
    mockWindows("main");

    mockIPC((cmd) => {
      if (cmd === "load_align_state") {
        return {
          grid: {
            enabled: true,
            shape: "hex",
            tx: 10,
            ty: -5,
            rotation: 0.6,
            spacingA: 150,
            spacingB: 175,
            cellWidth: 120,
            cellHeight: 130,
            opacity: 0.5,
          },
          excludedCells: [{ i: 1, j: 2 }],
        };
      }
      return null;
    });

    const ports = createTauriDesktopPorts();
    await expect(ports.dataPort.loadAlignState("/tmp/workspace", 4)).resolves.toEqual({
      grid: {
        enabled: true,
        shape: "hex",
        tx: 10,
        ty: -5,
        rotation: 0.6,
        spacingA: 150,
        spacingB: 175,
        cellWidth: 120,
        cellHeight: 130,
        opacity: 0.5,
      },
      excludedCells: [{ i: 1, j: 2 }],
    });
  });
});
