import { Effect, Exit } from "effect";
import { useEffect, useRef, useState } from "react";

import type { FrameResult, RawFrameRequest, RoiFrameRequest, ViewerDataPort, ViewerSource } from "lisca/shared/contracts";
import { loadRawFrameEffect, loadRoiFrameEffect, toErrorMessage } from "lisca/shared/react";

export interface UseLoadAnnotatorEditorFrameParams {
  backend: ViewerDataPort;
  workspacePath: string | null;
  frameLoadKey: string | null;
  dataMode: "roi" | "raw";
  roiRequest: RoiFrameRequest | null;
  rawSource: ViewerSource | null;
  rawRequest: RawFrameRequest | null;
  onFrameLoaded?: (frame: FrameResult) => void;
}

export function useLoadAnnotatorEditorFrame({
  backend,
  workspacePath,
  frameLoadKey,
  dataMode,
  roiRequest,
  rawSource,
  rawRequest,
  onFrameLoaded,
}: UseLoadAnnotatorEditorFrameParams) {
  const onFrameLoadedRef = useRef(onFrameLoaded);
  onFrameLoadedRef.current = onFrameLoaded;

  const [editorFrame, setEditorFrame] = useState<FrameResult | null>(null);
  const [editorFrameLoading, setEditorFrameLoading] = useState(false);
  const [editorFrameError, setEditorFrameError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspacePath || !frameLoadKey) {
      setEditorFrame(null);
      setEditorFrameLoading(false);
      setEditorFrameError(null);
      return;
    }

    const abortController = new AbortController();
    setEditorFrameLoading(true);
    setEditorFrameError(null);

    const program =
      dataMode === "roi" && roiRequest
        ? loadRoiFrameEffect(backend, workspacePath, roiRequest, {
            mode: "auto",
            min: 0,
            max: 65535,
          })
        : dataMode === "raw" && rawSource && rawRequest
          ? loadRawFrameEffect(backend, rawSource, rawRequest, {
              mode: "auto",
              min: 0,
              max: 65535,
            })
          : null;

    if (!program) {
      setEditorFrame(null);
      setEditorFrameLoading(false);
      return;
    }

    void Effect.runPromiseExit(program, { signal: abortController.signal }).then((exit) => {
      if (abortController.signal.aborted) return;
      if (Exit.isSuccess(exit)) {
        const loaded = exit.value.frame;
        setEditorFrame(loaded);
        setEditorFrameLoading(false);
        setEditorFrameError(null);
        onFrameLoadedRef.current?.(loaded);
        return;
      }
      setEditorFrame(null);
      setEditorFrameLoading(false);
      setEditorFrameError(toErrorMessage(exit.cause));
    });

    return () => abortController.abort();
  }, [backend, dataMode, frameLoadKey, rawRequest, rawSource, roiRequest, workspacePath]);

  return { editorFrame, editorFrameLoading, editorFrameError };
}
