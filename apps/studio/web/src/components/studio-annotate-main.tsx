import { AnnotationCanvas, SmartSegmentModelDialog } from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { useSmartSegment } from "@lisca/segmentation/browser";
import { useState } from "react";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { StudioAnalysisProgressModal } from "./studio-analysis-progress-modal";
import { StudioAnalysisStartModal } from "./studio-analysis-start-modal";

export function StudioAnnotateMain() {
  const { state } = useStudioAnnotatePage();
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
        <ViewportCard className="relative">
          <div className="flex min-h-[12rem] items-center justify-center p-6 text-center text-muted-foreground text-sm">
            Set a save location in Basic info, then align and crop ROIs before annotating.
          </div>
        </ViewportCard>
        <StudioAnalysisStartModal />
        <StudioAnalysisProgressModal />
      </>
    );
  }

  if (!state.scanLoading && state.scan && state.scan.positions.length === 0) {
    return (
      <>
        <ViewportCard className="relative">
          <div className="flex min-h-[12rem] items-center justify-center p-6 text-center text-muted-foreground text-sm">
            No cropped ROI stacks found in the workspace. Complete Align pattern and crop ROIs
            first.
          </div>
        </ViewportCard>
        <StudioAnalysisStartModal />
        <StudioAnalysisProgressModal />
      </>
    );
  }

  return (
    <>
      <ViewportCard className="relative min-h-0 flex-1">
        <SmartSegmentModelDialog
          busy={smartSegment.busy}
          state={smartSegment.downloadState}
          onCancel={smartSegment.cancelDownload}
          onConfirm={() => void smartSegment.confirmDownload()}
        />
        <AnnotationCanvas
          activeLabelId={state.activeLabelId}
          brushSize={state.brushSize}
          className="min-h-0 flex-1"
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
      <StudioAnalysisStartModal />
      <StudioAnalysisProgressModal />
    </>
  );
}
