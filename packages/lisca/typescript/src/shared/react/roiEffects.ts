import { Effect } from "effect";

import type {
  AnnotationLabel,
  ContrastWindow,
  FrameResult,
  RawFrameRequest,
  ViewerDataPort,
  RoiFrameRequest,
  ViewerSelection,
  ViewerSource,
} from "lisca/shared/contracts";
import { clamp, coerceSelection, createSelection, getFrameContrastDomain } from "lisca/shared/core";

import { toErrorMessage } from "./errors";

type ContrastMode = "auto" | "manual";

function contrastWindowForFrame(
  frame: FrameResult | null,
): ContrastWindow {
  if (!frame) return { min: 0, max: 255 };
  return frame.contrastDomain ?? getFrameContrastDomain(frame);
}

function toError(error: unknown, fallback: string): Error {
  return new Error(toErrorMessage(error, fallback));
}

export function scanRoiWorkspaceEffect(backend: ViewerDataPort, workspacePath: string) {
  return Effect.tryPromise({
    try: () => backend.scanRoiWorkspace(workspacePath),
    catch: (error) => toError(error, "Failed to scan ROI workspace"),
  }).pipe(
    Effect.map((scan) => ({ scan })),
    Effect.withSpan("shared.scan-roi-workspace"),
  );
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
    Effect.withSpan("shared.scan-source"),
  );
}

export function loadAnnotationLabelsEffect(backend: ViewerDataPort, workspacePath: string) {
  return Effect.tryPromise({
    try: () => backend.loadAnnotationLabels(workspacePath),
    catch: (error) => toError(error, "Failed to load annotation labels"),
  }).pipe(
    Effect.map((labels: AnnotationLabel[]) => ({ labels })),
    Effect.withSpan("shared.load-annotation-labels"),
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
    Effect.withSpan("shared.load-roi-frame"),
  );
}

export function loadRawFrameEffect(
  backend: ViewerDataPort,
  source: ViewerSource,
  request: RawFrameRequest | ViewerSelection,
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
        request,
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
    Effect.withSpan("shared.load-raw-frame"),
  );
}
