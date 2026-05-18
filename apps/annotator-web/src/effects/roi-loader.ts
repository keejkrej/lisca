import type { ContrastWindow, FrameResult, RoiFrameRequest } from "@lisca/contracts";
import { Cause, Effect, Option } from "effect";

import type { AnnotatorApi } from "../api/annotator-client";
import {
  createEmptyMask,
  decodeMaskBase64Png,
  framePayloadToResult,
} from "../utils/annotation-utils";

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

const roiFrameCache = new FrameCache(8);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeContrastWindow(window: ContrastWindow, domain: ContrastWindow): ContrastWindow {
  return {
    min: clamp(Math.round(window.min), domain.min, Math.max(domain.min, domain.max - 1)),
    max: clamp(Math.round(window.max), Math.min(domain.min + 1, domain.max), domain.max),
  };
}

function normalizeFrameContrast(frame: FrameResult): FrameResult {
  const domain = frame.contrastDomain ?? { min: 0, max: 255 };
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

function frameCacheKey(
  workspacePath: string,
  request: RoiFrameRequest,
  contrast: ContrastWindow | null,
) {
  return JSON.stringify([
    workspacePath,
    request.pos,
    request.roi,
    request.channel,
    request.time,
    request.z,
    contrast?.min ?? "auto",
    contrast?.max ?? "auto",
  ]);
}

export function loadRoiFrameEffect(
  api: AnnotatorApi,
  workspacePath: string,
  request: RoiFrameRequest,
  contrast: ContrastWindow | null,
) {
  const cacheKey = frameCacheKey(workspacePath, request, contrast);
  const cached = roiFrameCache.get(cacheKey);
  if (cached) return Effect.succeed(cached);

  return Effect.tryPromise({
    try: (signal) => api.loadRoiFrame(workspacePath, request, contrast, signal),
    catch: (cause) => toError(cause, "ROI frame request failed"),
  }).pipe(
    Effect.map((payload) => {
      try {
        return framePayloadToResult(payload);
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        throw new Error(`ROI frame decode failed: ${detail}`);
      }
    }),
    Effect.map(normalizeFrameContrast),
    Effect.tap((frame) => Effect.sync(() => roiFrameCache.set(cacheKey, frame))),
    Effect.withSpan("annotator-web.load-roi-frame"),
  );
}

export function loadRoiFrameAnnotationEffect(
  api: AnnotatorApi,
  workspacePath: string,
  request: RoiFrameRequest,
  frame: FrameResult,
) {
  return Effect.tryPromise({
    try: async (signal) => {
      const loaded = await api.loadRoiFrameAnnotation(workspacePath, request, signal);
      if (!loaded.maskBase64Png) {
        return {
          classificationLabelId: loaded.annotation.classificationLabelId,
          mask: createEmptyMask(frame.width, frame.height),
        };
      }

      try {
        return {
          classificationLabelId: loaded.annotation.classificationLabelId,
          mask: await decodeMaskBase64Png(loaded.maskBase64Png, frame.width, frame.height),
        };
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        throw new Error(`Annotation mask decode failed: ${detail}`);
      }
    },
    catch: (cause) => toError(cause, "ROI annotation load failed"),
  }).pipe(Effect.withSpan("annotator-web.load-roi-frame-annotation"));
}

export function effectErrorMessage(error: unknown, fallback: string): string {
  const normalized = toError(error, fallback);
  if (
    normalized instanceof TypeError ||
    normalized.message.includes("Failed to fetch") ||
    normalized.message.includes("NetworkError") ||
    normalized.message.includes("fetch failed")
  ) {
    return `${fallback}: server unreachable at 127.0.0.1:8766`;
  }
  return normalized.message;
}
