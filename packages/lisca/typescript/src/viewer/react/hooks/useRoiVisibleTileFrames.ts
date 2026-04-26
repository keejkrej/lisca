import { Effect, Exit } from "effect";
import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import type { FrameResult, RoiFrameRequest, RoiIndexEntry, ViewerDataPort } from "lisca/shared/contracts";
import { loadRoiFrameEffect, toErrorMessage } from "lisca/shared/react";

export interface RoiWorkspaceTileState {
  requestKey: string;
  frame: FrameResult | null;
  error: string | null;
  loading: boolean;
}

export interface RoiVisibleTileRequest {
  roi: RoiIndexEntry;
  request: RoiFrameRequest;
  requestKey: string;
}

export interface RoiTileFrameCache {
  get(key: string): { frame: FrameResult } | undefined;
  set(key: string, value: { frame: FrameResult }): void;
}

function tileStatesEqual(
  left: Record<number, RoiWorkspaceTileState>,
  right: Record<number, RoiWorkspaceTileState>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;

  for (const key of rightKeys) {
    const roi = Number(key);
    const leftState = left[roi];
    const rightState = right[roi];
    if (!leftState || !rightState) return false;
    if (
      leftState.requestKey !== rightState.requestKey ||
      leftState.frame !== rightState.frame ||
      leftState.error !== rightState.error ||
      leftState.loading !== rightState.loading
    ) {
      return false;
    }
  }

  return true;
}

export function useRoiVisibleTileFrames({
  backend,
  workspacePath,
  visibleRoiRequests,
  visibleRequestSignature,
  frameCacheRef,
  setTileStates,
}: {
  backend: ViewerDataPort;
  workspacePath: string | null;
  visibleRoiRequests: RoiVisibleTileRequest[];
  /** Stable signature of visible tile keys so the effect tracks navigation without referential noise. */
  visibleRequestSignature: string;
  frameCacheRef: MutableRefObject<RoiTileFrameCache>;
  setTileStates: Dispatch<SetStateAction<Record<number, RoiWorkspaceTileState>>>;
}) {
  useEffect(() => {
    if (!workspacePath || visibleRoiRequests.length === 0) {
      setTileStates((current) => (Object.keys(current).length === 0 ? current : {}));
      return;
    }

    const abortControllers: AbortController[] = [];
    const nextStates: Record<number, RoiWorkspaceTileState> = {};
    for (const { roi, request, requestKey } of visibleRoiRequests) {
      const cached = frameCacheRef.current.get(requestKey);

      nextStates[roi.roi] = {
        requestKey,
        frame: cached?.frame ?? null,
        error: null,
        loading: !cached,
      };

      if (cached) continue;

      const abortController = new AbortController();
      abortControllers.push(abortController);
      const program = loadRoiFrameEffect(backend, workspacePath, request, {
        mode: "auto",
        min: 0,
        max: 65535,
      });

      void Effect.runPromiseExit(program, {
        signal: abortController.signal,
      }).then((exit) => {
        if (abortController.signal.aborted) return;

        if (Exit.isSuccess(exit)) {
          frameCacheRef.current.set(requestKey, { frame: exit.value.frame });
          setTileStates((current) => {
            const active = current[roi.roi];
            if (!active || active.requestKey !== requestKey) return current;
            return {
              ...current,
              [roi.roi]: {
                requestKey,
                frame: exit.value.frame,
                error: null,
                loading: false,
              },
            };
          });
          return;
        }

        setTileStates((current) => {
          const active = current[roi.roi];
          if (!active || active.requestKey !== requestKey) return current;
          return {
            ...current,
            [roi.roi]: {
              requestKey,
              frame: null,
              error: toErrorMessage(exit.cause),
              loading: false,
            },
          };
        });
      });
    }

    setTileStates((current) => (tileStatesEqual(current, nextStates) ? current : nextStates));

    return () => {
      for (const controller of abortControllers) {
        controller.abort();
      }
    };
  }, [backend, frameCacheRef, visibleRequestSignature, visibleRoiRequests, workspacePath, setTileStates]);
}
