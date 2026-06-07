import { AppShell, HostFilePickerDialog } from "@lisca/ui";

import { annotatorHostOperations } from "../api/annotator-port";
import { useRoiPageState } from "../state/use-roi-page-state";
import { createEmptyMask } from "../utils/annotation-utils";
import { AnnotatorDock } from "./annotator-dock";
import { AnnotatorHeader } from "./annotator-header";
import { AnnotatorLeft } from "./annotator-left";
import { AnnotatorMain } from "./annotator-main";
import { AnnotatorRight } from "./annotator-right";
import { LabelCreationDialog } from "./label-creation-dialog";

export function RoiPage() {
  const page = useRoiPageState();

  return (
    <AppShell>
      <AppShell.Header>
        <AnnotatorHeader
          workspacePath={page.workspacePath}
          onCreateLabels={() => {
            page.setLabelError(null);
            page.setLabelDialogOpen(true);
          }}
          onPickWorkspace={() => page.setFilePickerOpen(true)}
        />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left widthClass="w-72">
          <AnnotatorLeft
            channel={page.selection.channel}
            contrastDomain={page.contrastDomain}
            contrastMax={page.contrastMax}
            contrastMin={page.contrastMin}
            position={page.position}
            pos={page.selection.pos}
            roi={page.selection.roi}
            scan={page.scan}
            timeIndex={page.selection.timeIndex}
            zIndex={page.selection.zIndex}
            onChannelChange={(value) =>
              page.changeSelection(() => page.setSelection({ channel: value }))
            }
            onContrastChange={page.setContrast}
            onPosChange={(value) =>
              page.changeSelection(() => {
                page.setSelection({ pos: value, roi: null });
              })
            }
            onRoiChange={(value) => page.changeSelection(() => page.setSelection({ roi: value }))}
            onTimeIndexChange={(value) =>
              page.changeSelection(() => page.setSelection({ timeIndex: value }))
            }
            onZIndexChange={(value) =>
              page.changeSelection(() => page.setSelection({ zIndex: value }))
            }
          />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <AnnotatorMain
              activeLabelId={page.activeLabelId}
              brushSize={page.brushSize}
              disabled={!page.canEditSegmentation}
              frame={page.frame}
              labels={page.labels}
              mask={page.annotation.current.mask}
              overlayOpacity={page.overlayOpacity}
              toasts={page.canvasToasts}
              tool={page.tool}
              onMaskCommit={(mask) =>
                page.annotation.commit({
                  classificationLabelId: page.annotation.current.classificationLabelId,
                  mask,
                })
              }
            />
          </AppShell.Main>
          <AppShell.Dock>
            <AnnotatorDock
              canSave={page.canSave}
              mode={page.mode}
              request={page.request}
              saving={page.saving}
              shortcutsEnabled={
                page.mode === "segmentation" &&
                page.canEditSegmentation &&
                !page.labelDialogOpen &&
                !page.filePickerOpen
              }
              tool={page.tool}
              onSave={() => void page.handleSave()}
              onToolChange={page.setTool}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <AnnotatorRight
            activeLabelId={page.activeLabelId}
            annotation={page.annotation.current}
            annotationError={page.annotationError}
            annotationLoading={page.annotationLoading}
            brushSize={page.brushSize}
            canRedo={page.annotation.canRedo}
            canEdit={page.canEdit}
            canUndo={page.annotation.canUndo}
            dirty={page.annotation.dirty}
            frameError={page.frameError}
            frameLoading={page.frameLoading}
            labels={page.labels}
            mode={page.mode}
            overlayOpacity={page.overlayOpacity}
            saveError={page.saveError}
            scanError={page.scanError}
            scanLoading={page.scanLoading}
            onClassificationChange={(labelId) =>
              page.annotation.commit({
                classificationLabelId: labelId,
                mask: page.annotation.current.mask,
              })
            }
            onClear={() =>
              page.frame &&
              page.annotation.commit({
                classificationLabelId: page.annotation.current.classificationLabelId,
                mask: createEmptyMask(page.frame.width, page.frame.height),
              })
            }
            onDiscard={page.annotation.discard}
            onBrushSizeChange={page.setBrushSize}
            onModeChange={page.setMode}
            onOverlayOpacityChange={page.setOverlayOpacity}
            onPaintLabelChange={page.setActiveLabelId}
            onRedo={page.annotation.redo}
            onUndo={page.annotation.undo}
          />
        </AppShell.Right>
      </AppShell.Body>
      <HostFilePickerDialog
        hostPort={annotatorHostOperations}
        mode="workspace"
        open={page.filePickerOpen}
        title="Workspace folder"
        onOpenChange={page.setFilePickerOpen}
        onPickDirectory={page.pickWorkspace}
        onPickFile={() => undefined}
      />
      <LabelCreationDialog
        error={page.labelError}
        labels={page.labels}
        open={page.labelDialogOpen}
        saving={page.saveLabelsPending}
        workspacePath={page.workspacePath}
        onOpenChange={page.setLabelDialogOpen}
        onSave={(nextLabels) => void page.handleSaveLabels(nextLabels)}
      />
    </AppShell>
  );
}
