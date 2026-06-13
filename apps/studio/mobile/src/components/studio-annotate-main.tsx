import {
  AnnotationCanvas,
  SmartSegmentModelDialog,
  Text,
  ViewportCard,
} from "@lisca/ui-native";
import { useSmartSegment } from "@lisca/smart/segment/browser";
import { useState } from "react";
import { View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { StudioAnalysisProgressModal, StudioAnalysisStartModal } from "./studio-analysis-modals";

export function StudioAnnotateMain({ state }: { state: StudioAnnotateState }) {
  const classificationLabelId = state.annotation.current.classificationLabelId;
  const [smartSegmentStatus, setSmartSegmentStatus] = useState<string | null>(null);
  const [smartSegmentError, setSmartSegmentError] = useState<string | null>(null);
  const activeLabelValue = state.labels.findIndex((label) => label.id === state.activeLabelId) + 1;
  const onMaskCommit = (mask: Uint8Array) => {
    state.annotation.commit({
      classificationLabelId,
      mask,
    });
  };
  const smartSegment = useSmartSegment({
    frame: state.frame,
    tool: state.tool,
    activeLabelValue,
    mask: state.annotation.current.mask,
    enabled: state.canEditSegmentation,
    onCommit: onMaskCommit,
    onStatus: setSmartSegmentStatus,
    onError: setSmartSegmentError,
  });
  const toasts = smartSegmentError
    ? [{ text: smartSegmentError, tone: "error" as const }]
    : smartSegmentStatus
      ? [...state.canvasToasts, { text: smartSegmentStatus }]
      : state.canvasToasts;

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
              No cropped ROI stacks found in the workspace. Complete Align pattern and crop ROIs
              first.
            </Text>
          </View>
        </ViewportCard>
        <StudioAnalysisStartModal state={state} />
        <StudioAnalysisProgressModal state={state} />
      </>
    );
  }

  return (
    <>
      <ViewportCard>
        <SmartSegmentModelDialog
          busy={smartSegment.busy}
          state={smartSegment.downloadState}
          onCancel={smartSegment.cancelDownload}
          onConfirm={() => void smartSegment.confirmDownload()}
        />
        <AnnotationCanvas
          activeLabelId={state.activeLabelId}
          brushSize={state.brushSize}
          disabled={!state.canEditSegmentation || smartSegment.busy}
          frame={state.frame}
          labels={state.labels}
          mask={state.annotation.current.mask}
          overlayOpacity={state.overlayOpacity}
          smartSegmentPrompts={smartSegment.prompts}
          toasts={toasts}
          tool={state.tool}
          onMaskCommit={onMaskCommit}
          onSmartSegmentClick={(click) => void smartSegment.handleClick(click)}
          onSmartEraseClick={(click) => void smartSegment.handleEraseClick(click)}
        />
      </ViewportCard>
      <StudioAnalysisStartModal state={state} />
      <StudioAnalysisProgressModal state={state} />
    </>
  );
}
