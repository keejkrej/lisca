import { Effect } from "effect";

import type {
  ContrastWindow,
  FrameResult,
  RawFrameRequest,
  ViewerDataPort,
  RoiFrameRequest,
  ViewerSelection,
  ViewerSource,
} from "lisca/shared/contracts";
import { clamp, getFrameContrastDomain } from "lisca/shared/core";

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
