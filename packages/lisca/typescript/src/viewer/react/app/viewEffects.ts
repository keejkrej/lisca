import { Cause, Effect, Option } from "effect";

import type {
  AutoExcludePreviewRequest,
  AutoExcludePreviewResponse,
  AnnotationLabel,
  ContrastWindow,
  FrameResult,
  LoadedRoiFrameAnnotation,
  RoiFrameAnnotation,
  RoiFrameAnnotationPayload,
  RoiFrameRequest,
  RoiWorkspaceScan,
  ViewerDataPort,
  ViewerSelection,
  ViewerSource,
} from "lisca/viewer/contracts";
import {
  clamp,
  coerceSelection,
  createSelection,
  getFrameContrastDomain,
} from "lisca/viewer/core";

import type { ContrastMode } from "./viewStore";

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }
  if (Cause.isCause(error)) {
    const failure = Cause.failureOption(error);
    if (Option.isSome(failure)) {
      return toError(failure.value, fallback);
    }
    const defect = Cause.dieOption(error);
    if (Option.isSome(defect)) {
      return toError(defect.value, fallback);
    }
    const squashed = Cause.squash(error);
    return toError(squashed, fallback);
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message.length > 0
  ) {
    return new Error((error as { message: string }).message);
  }
  return new Error(typeof error === "string" && error.length > 0 ? error : fallback);
}

function contrastWindowForFrame(frame: FrameResult | null): ContrastWindow {
  if (!frame) return { min: 0, max: 255 };
  return frame.contrastDomain ?? getFrameContrastDomain(frame);
}

export function toErrorMessage(error: unknown): string {
  return toError(error, "Unknown viewer error").message;
}

export function scanSourceEffect(backend: ViewerDataPort, source: ViewerSource) {
  return Effect.tryPromise({
    try: () => backend.scanSource(source),
    catch: (error) => toError(error, "Failed to scan source"),
  }).pipe(
    Effect.map((scan) => ({
      scan,
      selection: coerceSelection(scan, createSelection(scan)),
    })),
    Effect.withSpan("viewer.scan-source"),
  );
}

export function scanRoiWorkspaceEffect(backend: ViewerDataPort, workspacePath: string) {
  return Effect.tryPromise({
    try: () => backend.scanRoiWorkspace(workspacePath),
    catch: (error) => toError(error, "Failed to scan ROI workspace"),
  }).pipe(
    Effect.map((scan) => ({ scan })),
    Effect.withSpan("viewer.scan-roi-workspace"),
  );
}

export function autoExcludePreviewEffect(
  backend: ViewerDataPort,
  request: AutoExcludePreviewRequest,
) {
  return Effect.tryPromise({
    try: () => backend.autoExcludePreview(request),
    catch: (error) => toError(error, "Failed to compute auto exclude preview"),
  }).pipe(
    Effect.map((preview: AutoExcludePreviewResponse) => ({ preview })),
    Effect.withSpan("viewer.auto-exclude-preview"),
  );
}

export function loadAnnotationLabelsEffect(backend: ViewerDataPort, workspacePath: string) {
  return Effect.tryPromise({
    try: () => backend.loadAnnotationLabels(workspacePath),
    catch: (error) => toError(error, "Failed to load annotation labels"),
  }).pipe(
    Effect.map((labels: AnnotationLabel[]) => ({ labels })),
    Effect.withSpan("viewer.load-annotation-labels"),
  );
}

export function loadFrameEffect(
  backend: ViewerDataPort,
  source: ViewerSource,
  selection: ViewerSelection,
  contrast: {
    mode: ContrastMode;
    min: number;
    max: number;
  },
) {
  const requestedContrast =
    contrast.mode === "manual"
      ? ({
          min: contrast.min,
          max: contrast.max,
        } satisfies ContrastWindow)
      : undefined;

  return Effect.tryPromise({
    try: () =>
      backend.loadFrame(
        source,
        selection,
        requestedContrast ? { contrast: requestedContrast } : undefined,
      ),
    catch: (error) => toError(error, "Failed to load frame"),
  }).pipe(
    Effect.map((frame) => {
      const domain = contrastWindowForFrame(frame);
      const applied = frame.appliedContrast ?? frame.suggestedContrast ?? domain;

      return {
        frame,
        contrastMin: clamp(
          Math.round(applied.min),
          domain.min,
          Math.max(domain.min, domain.max - 1),
        ),
        contrastMax: clamp(
          Math.round(applied.max),
          Math.min(domain.min + 1, domain.max),
          domain.max,
        ),
      };
    }),
    Effect.withSpan("viewer.load-frame"),
  );
}

export function loadRoiFrameEffect(
  backend: ViewerDataPort,
  workspacePath: string,
  request: RoiFrameRequest,
  contrast: {
    mode: ContrastMode;
    min: number;
    max: number;
  },
) {
  const requestedContrast =
    contrast.mode === "manual"
      ? ({
          min: contrast.min,
          max: contrast.max,
        } satisfies ContrastWindow)
      : undefined;

  return Effect.tryPromise({
    try: () =>
      backend.loadRoiFrame(
        workspacePath,
        request,
        requestedContrast ? { contrast: requestedContrast } : undefined,
      ),
    catch: (error) => toError(error, "Failed to load ROI frame"),
  }).pipe(
    Effect.map((frame) => {
      const domain = contrastWindowForFrame(frame);
      const applied = frame.appliedContrast ?? frame.suggestedContrast ?? domain;

      return {
        frame,
        contrastMin: clamp(
          Math.round(applied.min),
          domain.min,
          Math.max(domain.min, domain.max - 1),
        ),
        contrastMax: clamp(
          Math.round(applied.max),
          Math.min(domain.min + 1, domain.max),
          domain.max,
        ),
      };
    }),
    Effect.withSpan("viewer.load-roi-frame"),
  );
}

export function loadRoiFrameAnnotationEffect(
  backend: ViewerDataPort,
  workspacePath: string,
  request: RoiFrameRequest,
) {
  return Effect.tryPromise({
    try: () => backend.loadRoiFrameAnnotation(workspacePath, request),
    catch: (error) => toError(error, "Failed to load ROI frame annotation"),
  }).pipe(
    Effect.map((loaded: LoadedRoiFrameAnnotation) => ({ loaded })),
    Effect.withSpan("viewer.load-roi-frame-annotation"),
  );
}

export function saveRoiFrameAnnotationEffect(
  backend: ViewerDataPort,
  {
    workspacePath,
    request,
    annotation,
  }: {
    workspacePath: string;
    request: RoiFrameRequest;
    annotation: RoiFrameAnnotationPayload;
  },
) {
  return Effect.tryPromise({
    try: () => backend.saveRoiFrameAnnotation(workspacePath, request, annotation),
    catch: (error) => toError(error, "Failed to save ROI frame annotation"),
  }).pipe(
    Effect.map((saved: RoiFrameAnnotation) => ({ saved })),
    Effect.withSpan("viewer.save-roi-frame-annotation"),
  );
}

export function saveBboxEffect(
  backend: ViewerDataPort,
  {
    workspacePath,
    source,
    pos,
    csv,
  }: {
    workspacePath: string;
    source: ViewerSource;
    pos: number;
    csv: string;
  },
) {
  return Effect.tryPromise({
    try: () => backend.saveBbox(workspacePath, source, pos, csv),
    catch: (error) => toError(error, "Failed to save bbox CSV"),
  }).pipe(Effect.withSpan("viewer.save-bbox"));
}

export function cropRoiEffect(
  backend: ViewerDataPort,
  {
    workspacePath,
    source,
    pos,
  }: {
    workspacePath: string;
    source: ViewerSource;
    pos: number;
  },
) {
  return Effect.tryPromise({
    try: () => backend.cropRoi(workspacePath, source, pos, "tiff"),
    catch: (error) => toError(error, "Failed to crop ROI TIFFs"),
  }).pipe(Effect.withSpan("viewer.crop-roi"));
}
