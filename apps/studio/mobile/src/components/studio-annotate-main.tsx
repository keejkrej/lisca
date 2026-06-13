import {
  AnnotationCanvas,
  SmartSegmentModelDialog,
  Text,
  ViewportCard,
} from "@lisca/ui-native";
import { useSmartSegment } from "@lisca/smart/segment/browser";
import { useState } from "react";
import { View } from "react-native";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { useStudioAnnotateCanvas } from "../state/studio-annotate-page-selectors";
import { StudioAnalysisProgressModal, StudioAnalysisStartModal } from "./studio-analysis-modals";

export function StudioAnnotateMain() {
  const { state } = useStudioAnnotatePage();
  const canvas = useStudioAnnotateCanvas();
  const classificationLabelId = canvas.annotation.current.classificationLabelId;
  const [smartSegmentStatus, setSmartSegmentStatus] = useState<string | null>(null);
  const [smartSegmentError, setSmartSegmentError] = useState<string | null>(null);
  const activeLabelValue =
    canvas.labels.findIndex((label) => label.id === canvas.activeLabelId) + 1;
  const onMaskCommit = (mask: Uint8Array) => {
    canvas.annotation.commit({
      classificationLabelId,
      mask,
    });
  };
  const smartSegment = useSmartSegment({
    frame: canvas.frame,
    tool: canvas.tool,
    activeLabelValue,
    mask: canvas.annotation.current.mask,
    enabled: canvas.canEditSegmentation,
    onCommit: onMaskCommit,
    onStatus: setSmartSegmentStatus,
    onError: setSmartSegmentError,
  });
  const toasts = smartSegmentError
    ? [{ text: smartSegmentError, tone: "error" as const }]
    : smartSegmentStatus
      ? [...canvas.canvasToasts, { text: smartSegmentStatus }]
      : canvas.canvasToasts;

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
          activeLabelId={canvas.activeLabelId}
          brushSize={canvas.brushSize}
          disabled={!canvas.canEditSegmentation || smartSegment.busy}
          frame={canvas.frame}
          labels={canvas.labels}
          mask={canvas.annotation.current.mask}
          overlayOpacity={canvas.overlayOpacity}
          smartSegmentPrompts={smartSegment.prompts}
          toasts={toasts}
          tool={canvas.tool}
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
