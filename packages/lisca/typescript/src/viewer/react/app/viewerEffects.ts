import { Cause, Effect, Option } from "effect";

import type {
  ContrastWindow,
  FrameResult,
  ViewerDataPort,
  ViewerSelection,
  ViewerSource,
} from "lisca/shared/contracts";
import { clamp, getFrameContrastDomain } from "lisca/shared/core";
import { toErrorMessage as toSharedErrorMessage } from "lisca/shared/react";

import type { ContrastMode } from "./viewerStore";

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
  return toSharedErrorMessage(error);
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
