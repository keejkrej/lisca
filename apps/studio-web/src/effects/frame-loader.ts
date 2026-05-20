import type { AlignerDataPort } from "@lisca/client/ports/types";
import type { AlignerSource, ContrastWindow, FrameRequest, FrameResult } from "@lisca/contracts";
import { normalizeFrameContrast } from "@lisca/utils";
import { Cause, Effect, Option } from "effect";

type AbortableAlignerDataPort = AlignerDataPort & {
  loadFrame(
    source: AlignerSource,
    request: FrameRequest,
    contrast?: ContrastWindow | null,
    signal?: AbortSignal,
  ): Promise<FrameResult>;
};

class FrameCache {
  private readonly frames = new Map<string, FrameResult>();

  constructor(private readonly maxEntries: number) {}

  get(key: string): FrameResult | null {
    const frame = this.frames.get(key);
    if (!frame) return null;
    this.frames.delete(key);
    this.frames.set(key, frame);
    return frame;
  }

  set(key: string, frame: FrameResult): void {
    if (this.frames.has(key)) this.frames.delete(key);
    this.frames.set(key, frame);
    while (this.frames.size > this.maxEntries) {
      const oldest = this.frames.keys().next().value as string | undefined;
      if (!oldest) break;
      this.frames.delete(oldest);
    }
  }
}

const studioFrameCache = new FrameCache(8);

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  if (Cause.isCause(error)) {
    const failure = Cause.failureOption(error);
    if (Option.isSome(failure)) return toError(failure.value, fallback);
    const defect = Cause.dieOption(error);
    if (Option.isSome(defect)) return toError(defect.value, fallback);
    return toError(Cause.squash(error), fallback);
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }
  return new Error(typeof error === "string" && error ? error : fallback);
}

function frameCacheKey(
  source: AlignerSource,
  selection: FrameRequest,
  contrast: ContrastWindow | null,
): string {
  return JSON.stringify([
    source,
    selection.pos,
    selection.channel,
    selection.time,
    selection.z,
    contrast?.min ?? "auto",
    contrast?.max ?? "auto",
  ]);
}

export function loadFrameEffect(
  backend: AbortableAlignerDataPort,
  source: AlignerSource,
  selection: FrameRequest,
  contrast: ContrastWindow | null,
) {
  const cacheKey = frameCacheKey(source, selection, contrast);
  const cached = studioFrameCache.get(cacheKey);
  if (cached) return Effect.succeed(cached);
  return Effect.tryPromise({
    try: (signal) => backend.loadFrame(source, selection, contrast, signal),
    catch: (cause) => toError(cause, "Frame request failed"),
  }).pipe(
    Effect.map(normalizeFrameContrast),
    Effect.tap((frame) => Effect.sync(() => studioFrameCache.set(cacheKey, frame))),
    Effect.withSpan("studio-web.load-frame"),
  );
}

export function effectErrorMessage(error: unknown): string {
  const normalized = toError(error, "Frame request failed");
  if (
    normalized instanceof TypeError ||
    normalized.message.includes("Failed to fetch") ||
    normalized.message.includes("NetworkError") ||
    normalized.message.includes("fetch failed")
  ) {
    return "Frame request failed: server unreachable at 127.0.0.1:8767";
  }
  return normalized.message;
}
