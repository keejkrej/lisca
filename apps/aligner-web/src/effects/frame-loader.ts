import type {
  AlignerDataPort,
  AlignerSource,
  ContrastWindow,
  FrameRequest,
  FrameResult,
} from "@lisca/contracts";
import { clamp } from "@lisca/utils";
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

export const alignerFrameCache = new FrameCache(8);

function defaultContrastDomain(frame: FrameResult): ContrastWindow {
  if (frame.pixelType === "uint8" || frame.pixelType === "uint8clamped") {
    return { min: 0, max: 255 };
  }
  return { min: 0, max: 65535 };
}

function normalizeContrastWindow(window: ContrastWindow, domain: ContrastWindow): ContrastWindow {
  return {
    min: clamp(Math.round(window.min), domain.min, Math.max(domain.min, domain.max - 1)),
    max: clamp(Math.round(window.max), Math.min(domain.min + 1, domain.max), domain.max),
  };
}

function normalizeFrameContrast(frame: FrameResult): FrameResult {
  const domain = frame.contrastDomain ?? defaultContrastDomain(frame);
  const suggested = normalizeContrastWindow(frame.suggestedContrast ?? domain, domain);
  const applied = normalizeContrastWindow(frame.appliedContrast ?? suggested, domain);

  return {
    ...frame,
    contrastDomain: domain,
    suggestedContrast: suggested,
    appliedContrast: applied,
  };
}

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

export function frameCacheKey(
  source: AlignerSource,
  selection: FrameRequest,
  contrast: ContrastWindow | null,
): string {
  return JSON.stringify([
    source.kind,
    source.path,
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
  const cached = alignerFrameCache.get(cacheKey);
  if (cached) return Effect.succeed(cached);

  return Effect.tryPromise({
    try: (signal) => backend.loadFrame(source, selection, contrast, signal),
    catch: (cause) => toError(cause, "Frame request failed"),
  }).pipe(
    Effect.map(normalizeFrameContrast),
    Effect.tap((frame) => Effect.sync(() => alignerFrameCache.set(cacheKey, frame))),
    Effect.withSpan("aligner-web.load-frame"),
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
    return "Frame request failed: server unreachable at 127.0.0.1:8765";
  }
  return normalized.message;
}
