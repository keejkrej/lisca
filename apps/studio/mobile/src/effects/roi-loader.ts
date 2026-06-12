import type { AnnotatorDataPort } from "@lisca/client/ports/types";
import { ClientError } from "@lisca/client/client-error";
import type { ContrastWindow, LoadedRoiFrameAnnotation, RoiFrameRequest } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { normalizeFrameContrast } from "@lisca/utils";
import { Effect } from "effect";

import { toErrorMessage } from "../api/studio-port";
import {
  createEmptyMask,
  decodeMaskBase64Png,
  type AnnotationValue,
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
  api: AnnotatorDataPort,
  workspacePath: string,
  request: RoiFrameRequest,
  contrast: ContrastWindow | null,
) {
  const cacheKey = frameCacheKey(workspacePath, request, contrast);
  const cached = roiFrameCache.get(cacheKey);
  if (cached) return Effect.succeed(cached);

  return api.loadRoiFrame(workspacePath, request, contrast).pipe(
    Effect.map(normalizeFrameContrast),
    Effect.tap((frame) => Effect.sync(() => roiFrameCache.set(cacheKey, frame))),
    Effect.withSpan("studio-mobile.load-roi-frame"),
  );
}

async function loadedAnnotationToValue(
  loaded: LoadedRoiFrameAnnotation,
  frame: FrameResult,
): Promise<AnnotationValue> {
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
    throw new Error(`Annotation mask decode failed: ${detail}`, { cause });
  }
}

export function loadRoiFrameWithAnnotationEffect(
  api: AnnotatorDataPort,
  workspacePath: string,
  request: RoiFrameRequest,
  contrast: ContrastWindow | null,
) {
  return Effect.gen(function* () {
    const frame = yield* loadRoiFrameEffect(api, workspacePath, request, contrast);
    const loadedAnnotation = yield* api.loadRoiFrameAnnotation(workspacePath, request);
    const annotation = yield* Effect.tryPromise({
      try: () => loadedAnnotationToValue(loadedAnnotation, frame),
      catch: (cause) =>
        new ClientError({
          message: toErrorMessage(cause, "ROI frame and annotation request failed"),
          cause,
        }),
    });
    return { frame, annotation };
  }).pipe(Effect.withSpan("studio-mobile.load-roi-frame-with-annotation"));
}

export function effectErrorMessage(error: unknown, fallback: string): string {
  return toErrorMessage(error, fallback);
}
