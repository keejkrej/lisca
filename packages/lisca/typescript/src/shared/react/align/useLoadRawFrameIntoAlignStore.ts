import { Effect, Exit } from "effect";
import { useEffect } from "react";

import type {
  ContrastWindow,
  FrameResult,
  ViewerDataPort,
  ViewerSelection,
  ViewerSource,
} from "lisca/shared/contracts";
import { clamp, getFrameContrastDomain } from "lisca/shared/core";

import type { AlignContrastMode, AlignStore } from "./alignStore";
import { patchAlignState } from "./alignStore";
import { toErrorMessage } from "../errors";

function contrastWindowForFrame(frame: FrameResult | null): ContrastWindow {
  if (!frame) return { min: 0, max: 255 };
  return frame.contrastDomain ?? getFrameContrastDomain(frame);
}

function loadFrameEffect(
  backend: ViewerDataPort,
  source: ViewerSource,
  selection: ViewerSelection,
  contrast: {
    mode: AlignContrastMode;
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
    catch: (error) => toErrorMessage(error, "Failed to load frame"),
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
    Effect.withSpan("align.load-raw-frame"),
  );
}

export interface UseLoadRawFrameIntoAlignStoreArgs {
  store: AlignStore;
  backend: ViewerDataPort | null | undefined;
  source: ViewerSource | null;
  selection: ViewerSelection | null;
  contrastMode: AlignContrastMode;
  contrastMin: number;
  contrastMax: number;
  /** Include auto token or manual min:max so effect re-runs when contrast inputs change. */
  contrastRequestKey: string;
}

export function useLoadRawFrameIntoAlignStore({
  store,
  backend,
  source,
  selection,
  contrastMode,
  contrastMin,
  contrastMax,
  contrastRequestKey,
}: UseLoadRawFrameIntoAlignStoreArgs) {
  useEffect(() => {
    if (!backend || !source || !selection) return;

    const abortController = new AbortController();
    patchAlignState(store, { loading: true, error: null });

    const program = loadFrameEffect(backend, source, selection, {
      mode: contrastMode,
      min: contrastMin,
      max: contrastMax,
    }).pipe(
      Effect.tap(({ frame, contrastMin: cmin, contrastMax: cmax }) =>
        Effect.sync(() => {
          patchAlignState(store, {
            contrastMin: cmin,
            contrastMax: cmax,
            contrastMode: "manual",
            frame,
          });
        }),
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          patchAlignState(store, {
            error: toErrorMessage(error),
            frame: null,
          });
        }),
      ),
      Effect.ensuring(
        Effect.sync(() => {
          patchAlignState(store, { loading: false });
        }),
      ),
    );

    void Effect.runPromiseExit(program, {
      signal: abortController.signal,
    }).then((exit) => {
      if (!Exit.isFailure(exit)) return;
      if (abortController.signal.aborted) return;
      patchAlignState(store, {
        error: toErrorMessage(exit.cause),
        frame: null,
      });
    });

    return () => {
      abortController.abort();
    };
  }, [
    backend,
    contrastMax,
    contrastMin,
    contrastMode,
    contrastRequestKey,
    selection,
    source,
    store,
  ]);
}
