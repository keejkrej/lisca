import { AnnotationCanvas, ViewportCard } from "@lisca/ui";
import { useMemo } from "react";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { StudioAnalysisProgressModal } from "./studio-analysis-progress-modal";
import { StudioAnalysisStartModal } from "./studio-analysis-start-modal";

export function StudioAnnotateMain({ state }: { state: StudioAnnotateState }) {
  const emptyMask = useMemo(
    () => (state.frame ? new Uint8Array(state.frame.width * state.frame.height) : new Uint8Array()),
    [state.frame],
  );
  const messages = useMemo(() => {
    if (!state.request) return [];
    const positionIndex =
      state.scan?.positions.findIndex((entry) => entry.pos === state.request?.pos) ?? -1;
    const positionCount = state.scan?.positions.length ?? 0;
    const roiIndex =
      state.position?.rois.findIndex((entry) => entry.roi === state.request?.roi) ?? -1;
    const roiCount = state.position?.rois.length ?? 0;
    if (positionIndex < 0 || positionCount === 0 || roiIndex < 0 || roiCount === 0) return [];
    return [{ text: `Pos ${positionIndex}/${positionCount}\nRoi ${roiIndex}/${roiCount}` }];
  }, [state.position, state.request, state.scan]);

  return (
    <>
      <ViewportCard className="relative">
        <AnnotationCanvas
          activeLabelId={null}
          brushSize={1}
          disabled
          frame={state.frame}
          labels={[]}
          mask={emptyMask}
          messages={messages.length ? messages : undefined}
          overlayOpacity={0}
          toasts={state.toasts}
          tool="brush"
          onMaskCommit={() => undefined}
        />
      </ViewportCard>
      <StudioAnalysisStartModal state={state} />
      <StudioAnalysisProgressModal state={state} />
    </>
  );
}
