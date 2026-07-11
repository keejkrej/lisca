import type {
  ContrastWindow,
  LoadedRoiFrameAnnotation,
  RoiFrameRequest,
  RoiIndexEntry,
  RoiPositionScan,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { createEmptyMask, masksEqual, normalizeFrameContrast } from "@lisca/utils";
import { Effect } from "effect";
import { createSignal } from "solid-js";

import { ClientError } from "../infra/client-error";
import type { AnnotatorDataPort } from "../ports/types";

type RoiFramePort = Pick<AnnotatorDataPort, "loadRoiFrame" | "loadRoiFrameAnnotation">;

export type AnnotationValue = {
  classificationLabelId: string | null;
  mask: Uint8Array;
};

export function cloneAnnotationValue(value: AnnotationValue): AnnotationValue {
  return {
    classificationLabelId: value.classificationLabelId,
    mask: value.mask.slice(),
  };
}

export function annotationValuesEqual(left: AnnotationValue, right: AnnotationValue): boolean {
  return (
    left.classificationLabelId === right.classificationLabelId && masksEqual(left.mask, right.mask)
  );
}

export function emptyAnnotationValue(frame: FrameResult | null): AnnotationValue {
  return {
    classificationLabelId: null,
    mask: frame ? createEmptyMask(frame.width, frame.height) : new Uint8Array(),
  };
}

export class AnnotationHistory {
  private saved: AnnotationValue;
  private values: AnnotationValue[];
  private index = 0;

  constructor(initial: AnnotationValue = emptyAnnotationValue(null)) {
    this.saved = cloneAnnotationValue(initial);
    this.values = [cloneAnnotationValue(initial)];
  }

  get current(): AnnotationValue {
    return this.values[this.index] ?? this.saved;
  }

  get dirty(): boolean {
    return !annotationValuesEqual(this.current, this.saved);
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index < this.values.length - 1;
  }

  reset(value: AnnotationValue): void {
    this.saved = cloneAnnotationValue(value);
    this.values = [cloneAnnotationValue(value)];
    this.index = 0;
  }

  commit(value: AnnotationValue): void {
    if (annotationValuesEqual(this.current, value)) return;
    this.values = this.values.slice(0, this.index + 1).map(cloneAnnotationValue);
    this.values.push(cloneAnnotationValue(value));
    this.index = this.values.length - 1;
  }

  undo(): void {
    this.index = Math.max(0, this.index - 1);
  }

  redo(): void {
    this.index = Math.min(this.values.length - 1, this.index + 1);
  }

  discard(): void {
    this.reset(this.saved);
  }

  markSaved(): void {
    this.reset(this.current);
  }
}

export type AnnotationHistoryHandle = {
  readonly current: AnnotationValue;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  reset: (value: AnnotationValue) => void;
  commit: (value: AnnotationValue) => void;
  undo: () => void;
  redo: () => void;
  discard: () => void;
  markSaved: () => void;
};

export function useAnnotationHistory(): AnnotationHistoryHandle {
  const history = new AnnotationHistory();
  const [revision, setRevision] = createSignal(0);
  const read = <T>(value: () => T): T => {
    revision();
    return value();
  };
  const mutate = (operation: () => void): void => {
    operation();
    setRevision((value) => value + 1);
  };

  return {
    get current() {
      return read(() => history.current);
    },
    get dirty() {
      return read(() => history.dirty);
    },
    get canUndo() {
      return read(() => history.canUndo);
    },
    get canRedo() {
      return read(() => history.canRedo);
    },
    reset: (value) => mutate(() => history.reset(value)),
    commit: (value) => mutate(() => history.commit(value)),
    undo: () => mutate(() => history.undo()),
    redo: () => mutate(() => history.redo()),
    discard: () => mutate(() => history.discard()),
    markSaved: () => mutate(() => history.markSaved()),
  };
}

export function makeRoiFrameRequest(
  position: RoiPositionScan | null,
  roi: RoiIndexEntry | null,
  channel: number | null,
  timeIndex: number,
  zIndex: number,
): RoiFrameRequest | null {
  if (!position || !roi || channel == null) return null;
  const time = position.times[timeIndex];
  const z = position.zSlices[zIndex];
  if (time == null || z == null) return null;
  return {
    pos: position.pos,
    roi: roi.roi,
    channel,
    time,
    z,
  };
}

export function annotationOutputPaths(request: RoiFrameRequest | null): string[] {
  if (!request) return ["annotations/roi/..."];
  const base = `annotations/roi/Pos${request.pos}/Roi${request.roi}/C${request.channel}_T${request.time}_Z${request.z}`;
  return [`${base}.json`, `${base}.png`];
}

export async function decodeMaskBase64Png(
  maskBase64Png: string,
  expectedWidth: number,
  expectedHeight: number,
): Promise<Uint8Array> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const target = new Image();
    target.addEventListener("load", () => resolve(target));
    target.addEventListener("error", () => reject(new Error("Failed to decode annotation mask")));
    target.src = `data:image/png;base64,${maskBase64Png}`;
  });
  if (image.naturalWidth !== expectedWidth || image.naturalHeight !== expectedHeight) {
    throw new Error("Annotation mask dimensions do not match ROI frame");
  }

  const canvas = document.createElement("canvas");
  canvas.width = expectedWidth;
  canvas.height = expectedHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to prepare annotation mask canvas");
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, expectedWidth, expectedHeight);
  const mask = new Uint8Array(expectedWidth * expectedHeight);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = imageData.data[index * 4] ?? 0;
  }
  return mask;
}

export async function encodeMaskToBase64Png(
  mask: Uint8Array,
  width: number,
  height: number,
): Promise<string> {
  if (mask.length !== width * height) {
    throw new Error("Annotation mask dimensions do not match ROI frame");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to prepare annotation mask canvas");
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index] ?? 0;
    const offset = index * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  context.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toDataURL("image/png").split(",")[1] ?? "";
}

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
      const oldest = this.frames.keys().next().value;
      if (typeof oldest !== "string") break;
      this.frames.delete(oldest);
    }
  }
}

function frameCacheKey(
  workspacePath: string,
  request: RoiFrameRequest,
  contrast: ContrastWindow | null,
): string {
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

export function createRoiFrameLoader(maxCacheEntries = 8) {
  const cache = new FrameCache(maxCacheEntries);

  function loadFrame(
    port: Pick<RoiFramePort, "loadRoiFrame">,
    workspacePath: string,
    request: RoiFrameRequest,
    contrast: ContrastWindow | null,
  ) {
    const cacheKey = frameCacheKey(workspacePath, request, contrast);
    const cached = cache.get(cacheKey);
    if (cached) return Effect.succeed(cached);

    return port.loadRoiFrame(workspacePath, request, contrast).pipe(
      Effect.map(normalizeFrameContrast),
      Effect.tap((frame) => Effect.sync(() => cache.set(cacheKey, frame))),
      Effect.withSpan("annotation-session.load-roi-frame"),
    );
  }

  function loadFrameWithAnnotation(
    port: RoiFramePort,
    workspacePath: string,
    request: RoiFrameRequest,
    contrast: ContrastWindow | null,
  ) {
    return Effect.gen(function* () {
      const frame = yield* loadFrame(port, workspacePath, request, contrast);
      const loadedAnnotation = yield* port.loadRoiFrameAnnotation(workspacePath, request);
      const annotation = yield* Effect.tryPromise({
        try: () => loadedAnnotationToValue(loadedAnnotation, frame),
        catch: (cause) =>
          new ClientError({
            message: annotationSessionErrorMessage(
              cause,
              "ROI frame and annotation request failed",
            ),
            cause,
          }),
      });
      return { frame, annotation };
    }).pipe(Effect.withSpan("annotation-session.load-roi-frame-with-annotation"));
  }

  return { loadFrame, loadFrameWithAnnotation };
}

const roiFrameLoader = createRoiFrameLoader();

export const loadRoiFrameEffect = roiFrameLoader.loadFrame;
export const loadRoiFrameWithAnnotationEffect = roiFrameLoader.loadFrameWithAnnotation;

export function annotationSessionErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ClientError && cause.message.trim()) return cause.message;
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return fallback;
}
