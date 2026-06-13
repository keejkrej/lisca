import { AnnotationCanvas, Text, ViewportCard } from "@lisca/ui-native";
import { View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { StudioAnalysisProgressModal, StudioAnalysisStartModal } from "./studio-analysis-modals";

export function StudioAnnotateMain({ state }: { state: StudioAnnotateState }) {
  if (state.workspaceMissing) {
    return (
      <>
        <ViewportCard>
          <View className="min-h-48 items-center justify-center p-6">
            <Text className="text-center text-sm text-muted-foreground">
              Set a save location in Basic info, then align and crop ROIs before annotating.
            </Text>
          </View>
        </ViewportCard>
        <StudioAnalysisStartModal state={state} />
        <StudioAnalysisProgressModal state={state} />
      </>
    );
  }

  if (!state.scanLoading && state.scan && state.scan.positions.length === 0) {
    return (
      <>
        <ViewportCard>
          <View className="min-h-48 items-center justify-center p-6">
            <Text className="text-center text-sm text-muted-foreground">
              No cropped ROI stacks found. Complete Align pattern and crop ROIs first.
            </Text>
          </View>
        </ViewportCard>
        <StudioAnalysisStartModal state={state} />
        <StudioAnalysisProgressModal state={state} />
      </>
    );
  }

  const onMaskCommit = (mask: Uint8Array) => {
    state.annotation.commit({
      classificationLabelId: state.annotation.current.classificationLabelId,
      mask,
    });
  };

  return (
    <>
      <ViewportCard>
        <AnnotationCanvas
          activeLabelId={state.activeLabelId}
          brushSize={state.brushSize}
          disabled={!state.canEditSegmentation}
          frame={state.frame}
          labels={state.labels}
          mask={state.annotation.current.mask}
          overlayOpacity={state.overlayOpacity}
          toasts={state.canvasToasts}
          tool={state.tool}
          onMaskCommit={onMaskCommit}
        />
      </ViewportCard>
      <StudioAnalysisStartModal state={state} />
      <StudioAnalysisProgressModal state={state} />
    </>
  );
}
