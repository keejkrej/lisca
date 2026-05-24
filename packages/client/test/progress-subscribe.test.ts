import { CropRoiProgressMessageSchema, schemaDecoderEither } from "@lisca/contracts";
import { Effect } from "effect";
import { describe, expect, test, vi } from "vitest";

import { pollProgressLoop, subscribeProgress } from "../src/progress-subscribe.ts";

const decodeCropRoiProgressMessage = schemaDecoderEither(CropRoiProgressMessageSchema);

type FakeWebSocketInstance = {
  url: string;
  readyState: number;
  addEventListener: (type: string, listener: EventListener) => void;
  close: () => void;
  simulateOpen: () => void;
  simulateMessage: (data: unknown) => void;
  simulateError: () => void;
  simulateClose: () => void;
};

function createFakeWebSocketFactory() {
  const instances: FakeWebSocketInstance[] = [];

  class FakeWebSocket {
    static readonly OPEN = 1;
    static readonly CLOSED = 3;

    readonly url: string;
    readyState = FakeWebSocket.OPEN;
    private listeners = new Map<string, Set<EventListener>>();

    constructor(url: string) {
      this.url = url;
      instances.push(this as unknown as FakeWebSocketInstance);
    }

    addEventListener(type: string, listener: EventListener) {
      const bucket = this.listeners.get(type) ?? new Set<EventListener>();
      bucket.add(listener);
      this.listeners.set(type, bucket);
    }

    close() {
      this.readyState = FakeWebSocket.CLOSED;
    }

    simulateOpen() {
      for (const listener of this.listeners.get("open") ?? []) {
        listener(new Event("open"));
      }
    }

    simulateMessage(data: unknown) {
      for (const listener of this.listeners.get("message") ?? []) {
        listener({ data: JSON.stringify(data) } as MessageEvent);
      }
    }

    simulateError() {
      for (const listener of this.listeners.get("error") ?? []) {
        listener(new Event("error"));
      }
    }

    simulateClose() {
      for (const listener of this.listeners.get("close") ?? []) {
        listener(new Event("close"));
      }
    }
  }

  return {
    FakeWebSocket: FakeWebSocket as unknown as typeof WebSocket,
    instances,
  };
}

describe("subscribeProgress", () => {
  test("delivers websocket messages for the matching request id", () => {
    const { FakeWebSocket, instances } = createFakeWebSocketFactory();
    const schedule = vi.fn((_callback: () => void, _delayMs: number) => 1);
    const clearSchedule = vi.fn();
    const progressEvents: Array<{ requestId: string; status: string }> = [];

    const stop = subscribeProgress({
      wsUrl: "ws://127.0.0.1:8765/ws",
      requestId: "req-1",
      onProgress: (progress) => progressEvents.push(progress),
      pollProgress: () =>
        Effect.succeed({
          requestId: "req-1",
          status: "running",
          position: 1,
          completedPositions: 0,
          totalPositions: 1,
          completedRois: 0,
          totalRois: 0,
          message: null,
          error: null,
        }),
      decodeMessage: decodeCropRoiProgressMessage,
      extractProgress: (message) => message.progress,
      matchRequestId: (message, requestId) => message.progress.requestId === requestId,
      isTerminal: (progress) => progress.status === "completed",
      createErrorProgress: () => ({
        requestId: "req-1",
        status: "error",
        position: null,
        completedPositions: 0,
        totalPositions: 0,
        completedRois: 0,
        totalRois: 0,
        message: null,
        error: "failed",
      }),
      WebSocketImpl: FakeWebSocket,
      schedule,
      clearSchedule,
    });

    const ws = instances[0];
    expect(ws?.url).toBe("ws://127.0.0.1:8765/ws");

    ws?.simulateOpen();
    ws?.simulateMessage({
      type: "cropRoiProgress",
      progress: {
        requestId: "req-1",
        status: "completed",
        position: 1,
        completedPositions: 1,
        totalPositions: 1,
        completedRois: 1,
        totalRois: 1,
        message: null,
        error: null,
      },
    });

    expect(progressEvents.at(-1)?.status).toBe("completed");
    stop();
  });

  test("starts poll fallback when websocket never opens", async () => {
    vi.useFakeTimers();
    let pollCount = 0;
    const pollProgress = vi.fn(() => {
      pollCount += 1;
      if (pollCount === 1) {
        return Effect.succeed({
          requestId: "req-2",
          status: "running",
          position: 1,
          completedPositions: 0,
          totalPositions: 1,
          completedRois: 0,
          totalRois: 0,
          message: null,
          error: null,
        });
      }
      return Effect.succeed({
        requestId: "req-2",
        status: "completed",
        position: 1,
        completedPositions: 1,
        totalPositions: 1,
        completedRois: 1,
        totalRois: 1,
        message: null,
        error: null,
      });
    });

    class NeverOpenWebSocket {
      addEventListener() {}
      close() {}
    }

    const progressEvents: Array<{ status: string }> = [];
    const stop = subscribeProgress({
      wsUrl: "ws://127.0.0.1:8765/ws",
      requestId: "req-2",
      onProgress: (progress) => progressEvents.push(progress),
      pollProgress,
      decodeMessage: decodeCropRoiProgressMessage,
      extractProgress: (message) => message.progress,
      matchRequestId: (message, requestId) => message.progress.requestId === requestId,
      isTerminal: (progress) => ["completed", "cancelled", "error"].includes(progress.status),
      createErrorProgress: () => ({
        requestId: "req-2",
        status: "error",
        position: null,
        completedPositions: 0,
        totalPositions: 0,
        completedRois: 0,
        totalRois: 0,
        message: null,
        error: "failed",
      }),
      fallbackDelayMs: 100,
      pollIntervalMs: 50,
      WebSocketImpl: NeverOpenWebSocket as unknown as typeof WebSocket,
      schedule: (callback, delayMs) => setTimeout(callback, delayMs) as unknown as number,
      clearSchedule: (handle) => clearTimeout(handle),
    });

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(0);

    expect(pollProgress).toHaveBeenCalled();
    expect(progressEvents.some((event) => event.status === "completed")).toBe(true);
    stop();
    vi.useRealTimers();
  });
});

describe("pollProgressLoop", () => {
  test("stops polling after teardown", async () => {
    vi.useFakeTimers();
    const pollProgress = vi.fn(() =>
      Effect.succeed({
        requestId: "req-3",
        status: "running",
        position: 1,
        completedPositions: 0,
        totalPositions: 1,
        completedRois: 0,
        totalRois: 0,
        message: null,
        error: null,
      }),
    );

    const stop = pollProgressLoop({
      pollProgress,
      onProgress: () => {},
      isTerminal: () => false,
      createErrorProgress: () => ({
        requestId: "req-3",
        status: "error",
        position: null,
        completedPositions: 0,
        totalPositions: 0,
        completedRois: 0,
        totalRois: 0,
        message: null,
        error: "failed",
      }),
      pollIntervalMs: 100,
      schedule: (callback, delayMs) => setTimeout(callback, delayMs) as unknown as number,
      clearSchedule: (handle) => clearTimeout(handle),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(pollProgress).toHaveBeenCalledTimes(1);
    stop();
    await vi.advanceTimersByTimeAsync(300);
    expect(pollProgress).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
