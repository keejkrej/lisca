import {
  AnnotationCanvas,
  AppShell,
  HostFilePickerDialog,
  LabelCreationDialog,
  SmartSegmentModelDialog,
  ViewportCard,
} from "@lisca/ui-native";
import { useSmartSegment } from "@lisca/smart/segment/browser";
import { useState } from "react";

import { annotatorHostOperations } from "../api/annotator-port";
import { useAnnotateCanvas } from "../state/annotate-page-selectors";
import { useAnnotateShell } from "../state/annotate-page-selectors";
import { AnnotatorDock } from "./annotator-dock";
import { AnnotatorHeader } from "./annotator-header";
import { AnnotatorLeft } from "./annotator-left";
import { AnnotatorRight } from "./annotator-right";
import { AnnotatorWorkSessionGate } from "./annotator-work-session-gate";

export function AnnotatePage() {
  const shell = useAnnotateShell();

  return (
    <AnnotatorWorkSessionGate>
      <AppShell>
      <AppShell.Header>
        <AnnotatorHeader />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left width={288}>
          <AnnotatorLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <AnnotatorMain />
          </AppShell.Main>
          <AppShell.Dock>
            <AnnotatorDock />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={288}>
          <AnnotatorRight />
        </AppShell.Right>
      </AppShell.Body>
      <HostFilePickerDialog
        hostPort={annotatorHostOperations}
        mode="workspace"
        open={shell.filePickerOpen}
        title="Workspace folder"
        onOpenChange={shell.setFilePickerOpen}
        onPickDirectory={shell.pickWorkspace}
        onPickFile={() => undefined}
      />
      <LabelCreationDialog
        error={shell.labelError}
        labels={shell.labels}
        open={shell.labelDialogOpen}
        saving={shell.saveLabelsPending}
        workspacePath={shell.workspacePath}
        onOpenChange={shell.setLabelDialogOpen}
        onSave={(nextLabels) => void shell.handleSaveLabels(nextLabels)}
      />
    </AppShell>
    </AnnotatorWorkSessionGate>
  );
}

function AnnotatorMain() {
  const canvas = useAnnotateCanvas();
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

  return (
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
  );
}
