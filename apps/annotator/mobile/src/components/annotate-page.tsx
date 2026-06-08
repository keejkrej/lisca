import { AppShell, HostFilePickerDialog } from "@lisca/ui-native";

import { annotatorHostOperations } from "../api/annotator-port";
import { useAnnotateState } from "../state/use-annotate-state";
import { createEmptyMask } from "../utils/annotation-utils";
import { AnnotatorDock } from "./annotator-dock";
import { AnnotatorHeader } from "./annotator-header";
import { AnnotatorLeft } from "./annotator-left";
import { AnnotatorMain } from "./annotator-main";
import { AnnotatorRight } from "./annotator-right";
import { LabelCreationDialog } from "./label-creation-dialog";

export function AnnotatePage() {
  const state = useAnnotateState();

  return (
    <AppShell>
      <AppShell.Header>
        <AnnotatorHeader
          workspacePath={state.workspacePath}
          onCreateLabels={() => {
            state.setLabelError(null);
            state.setLabelDialogOpen(true);
          }}
          onPickWorkspace={() => state.setFilePickerOpen(true)}
        />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left width={288}>
          <AnnotatorLeft
            channel={state.selection.channel}
            contrast={state.contrast}
            frame={state.frame}
            position={state.position}
            pos={state.selection.pos}
            roi={state.selection.roi}
            scan={state.scan}
            timeIndex={state.selection.timeIndex}
            zIndex={state.selection.zIndex}
            onChannelChange={(value) =>
              state.changeSelection(() => state.setSelection({ channel: value }))
            }
            onContrastChange={state.setContrast}
            onPosChange={(value) =>
              state.changeSelection(() => {
                state.setSelection({ pos: value, roi: null });
              })
            }
            onRoiChange={(value) => state.changeSelection(() => state.setSelection({ roi: value }))}
            onTimeIndexChange={(value) =>
              state.changeSelection(() => state.setSelection({ timeIndex: value }))
            }
            onZIndexChange={(value) =>
              state.changeSelection(() => state.setSelection({ zIndex: value }))
            }
          />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <AnnotatorMain
              activeLabelId={state.activeLabelId}
              brushSize={state.brushSize}
              classificationLabelId={state.annotation.current.classificationLabelId}
              commitAnnotation={state.annotation.commit}
              disabled={!state.canEditSegmentation}
              frame={state.frame}
              labels={state.labels}
              mask={state.annotation.current.mask}
              overlayOpacity={state.overlayOpacity}
              toasts={state.canvasToasts}
              tool={state.tool}
            />
          </AppShell.Main>
          <AppShell.Dock>
            <AnnotatorDock
              canSave={state.canSave}
              mode={state.mode}
              request={state.request}
              saving={state.saving}
              shortcutsEnabled={
                state.mode === "segmentation" &&
                state.canEditSegmentation &&
                !state.labelDialogOpen &&
                !state.filePickerOpen
              }
              tool={state.tool}
              onSave={() => void state.handleSave()}
              onToolChange={state.setTool}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={288}>
          <AnnotatorRight
            activeLabelId={state.activeLabelId}
            annotation={state.annotation.current}
            annotationError={state.annotationError}
            annotationLoading={state.annotationLoading}
            brushSize={state.brushSize}
            canRedo={state.annotation.canRedo}
            canEdit={state.canEdit}
            canUndo={state.annotation.canUndo}
            dirty={state.annotation.dirty}
            frameError={state.frameError}
            frameLoading={state.frameLoading}
            labels={state.labels}
            mode={state.mode}
            overlayOpacity={state.overlayOpacity}
            saveError={state.saveError}
            scanError={state.scanError}
            scanLoading={state.scanLoading}
            onClassificationChange={(labelId) =>
              state.annotation.commit({
                classificationLabelId: labelId,
                mask: state.annotation.current.mask,
              })
            }
            onClear={() =>
              state.frame &&
              state.annotation.commit({
                classificationLabelId: state.annotation.current.classificationLabelId,
                mask: createEmptyMask(state.frame.width, state.frame.height),
              })
            }
            onDiscard={state.annotation.discard}
            onBrushSizeChange={state.setBrushSize}
            onModeChange={state.setMode}
            onOverlayOpacityChange={state.setOverlayOpacity}
            onPaintLabelChange={state.setActiveLabelId}
            onRedo={state.annotation.redo}
            onUndo={state.annotation.undo}
          />
        </AppShell.Right>
      </AppShell.Body>
      <HostFilePickerDialog
        hostPort={annotatorHostOperations}
        mode="workspace"
        open={state.filePickerOpen}
        title="Workspace folder"
        onOpenChange={state.setFilePickerOpen}
        onPickDirectory={state.pickWorkspace}
        onPickFile={() => undefined}
      />
      <LabelCreationDialog
        error={state.labelError}
        labels={state.labels}
        open={state.labelDialogOpen}
        saving={state.saveLabelsPending}
        workspacePath={state.workspacePath}
        onOpenChange={state.setLabelDialogOpen}
        onSave={(nextLabels) => void state.handleSaveLabels(nextLabels)}
      />
    </AppShell>
  );
}
