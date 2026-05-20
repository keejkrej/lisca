import { formatSchemaError } from "@lisca/contracts";
import * as Either from "effect/Either";
import type * as ParseResult from "effect/ParseResult";

export type ProgressPollOptions<TProgress> = {
  pollProgress: () => Promise<TProgress>;
  onProgress: (progress: TProgress) => void;
  isTerminal: (progress: TProgress) => boolean;
  createErrorProgress: (cause: unknown) => TProgress;
  pollIntervalMs?: number;
  schedule?: (callback: () => void, delayMs: number) => number;
  clearSchedule?: (handle: number) => void;
};

export function pollProgressLoop<TProgress>(options: ProgressPollOptions<TProgress>): () => void {
  const schedule =
    options.schedule ?? ((callback, delayMs) => window.setTimeout(callback, delayMs));
  const clearSchedule = options.clearSchedule ?? ((handle) => window.clearTimeout(handle));
  const pollIntervalMs = options.pollIntervalMs ?? 350;
  let closed = false;
  let pollHandle: number | null = null;

  const poll = async () => {
    if (closed) return;
    try {
      const progress = await options.pollProgress();
      onProgressSafe(progress);
      if (options.isTerminal(progress)) return;
    } catch (cause) {
      onProgressSafe(options.createErrorProgress(cause));
      return;
    }
    pollHandle = schedule(poll, pollIntervalMs);
  };

  const onProgressSafe = (progress: TProgress) => {
    if (!closed) {
      options.onProgress(progress);
    }
  };

  void poll();

  return () => {
    closed = true;
    if (pollHandle != null) {
      clearSchedule(pollHandle);
    }
  };
}

export type ProgressSubscriptionOptions<TProgress, TMessage> = {
  wsUrl: string;
  requestId: string;
  onProgress: (progress: TProgress) => void;
  pollProgress: () => Promise<TProgress>;
  decodeMessage: (input: unknown) => Either.Either<TMessage, ParseResult.ParseError>;
  extractProgress: (message: TMessage) => TProgress;
  matchRequestId: (message: TMessage, requestId: string) => boolean;
  isTerminal: (progress: TProgress) => boolean;
  createErrorProgress: (cause: unknown) => TProgress;
  fallbackDelayMs?: number;
  pollIntervalMs?: number;
  debugLabel?: string;
  isDev?: boolean;
  WebSocketImpl?: typeof WebSocket;
  schedule?: (callback: () => void, delayMs: number) => number;
  clearSchedule?: (handle: number) => void;
};

export function subscribeProgress<TProgress, TMessage>(
  options: ProgressSubscriptionOptions<TProgress, TMessage>,
): () => void {
  const WebSocketImpl = options.WebSocketImpl ?? WebSocket;
  const schedule =
    options.schedule ?? ((callback, delayMs) => window.setTimeout(callback, delayMs));
  const clearSchedule = options.clearSchedule ?? ((handle) => window.clearTimeout(handle));
  const fallbackDelayMs = options.fallbackDelayMs ?? 1500;
  const debugLabel = options.debugLabel ?? "lisca-ws";

  let closed = false;
  let terminal = false;
  let ws: WebSocket | null = null;
  let stopFallback: (() => void) | null = null;

  const startFallback = () => {
    if (closed || stopFallback) return;
    stopFallback = pollProgressLoop({
      pollProgress: options.pollProgress,
      onProgress: options.onProgress,
      isTerminal: options.isTerminal,
      createErrorProgress: options.createErrorProgress,
      pollIntervalMs: options.pollIntervalMs,
      schedule,
      clearSchedule,
    });
  };

  const fallbackTimer = schedule(() => {
    if (closed) return;
    startFallback();
  }, fallbackDelayMs);

  try {
    ws = new WebSocketImpl(options.wsUrl);
  } catch {
    clearSchedule(fallbackTimer);
    startFallback();
  }

  ws?.addEventListener("open", () => {
    clearSchedule(fallbackTimer);
    void options
      .pollProgress()
      .then((progress) => {
        if (closed) return;
        options.onProgress(progress);
        terminal = options.isTerminal(progress);
        if (terminal) ws?.close();
      })
      .catch(() => {
        if (closed || stopFallback) return;
        startFallback();
      });
  });

  ws?.addEventListener("message", (event) => {
    if (closed) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(event.data));
    } catch {
      return;
    }
    const result = options.decodeMessage(parsed);
    if (Either.isLeft(result)) {
      if (options.isDev) {
        console.debug(`[${debugLabel}] protocol decode failed:`, formatSchemaError(result.left));
      }
      return;
    }
    const message = result.right;
    if (!options.matchRequestId(message, options.requestId)) return;
    options.onProgress(options.extractProgress(message));
    terminal = options.isTerminal(options.extractProgress(message));
    if (terminal) {
      ws?.close();
    }
  });

  ws?.addEventListener("error", () => {
    if (closed || stopFallback) return;
    clearSchedule(fallbackTimer);
    startFallback();
  });

  ws?.addEventListener("close", () => {
    if (closed || terminal || stopFallback) return;
    clearSchedule(fallbackTimer);
    startFallback();
  });

  return () => {
    closed = true;
    clearSchedule(fallbackTimer);
    stopFallback?.();
    ws?.close();
  };
}
