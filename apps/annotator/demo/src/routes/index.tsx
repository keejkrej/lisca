import { AppShell, LabelCreationDialog } from "@lisca/ui";
import { DemoNavbar, DemoNavbarActionButton } from "@lisca/web-demo";
import { createFileRoute } from "@tanstack/react-router";
import { Tags } from "lucide-react";

import { DemoAnnotatorDock } from "../components/demo-annotator-dock";
import { DemoAnnotatorLeft } from "../components/demo-annotator-left";
import { DemoAnnotatorMain } from "../components/demo-annotator-main";
import { DemoAnnotatorRight } from "../components/demo-annotator-right";
import { useDemoAnnotatorState } from "../state/use-demo-annotator-state";
import { createEmptyMask } from "../utils/annotation-utils";

export const Route = createFileRoute("/")({
  component: AnnotatorDemoPage,
});

function AnnotatorDemoPage() {
  const state = useDemoAnnotatorState();

  return (
    <AppShell>
      <AppShell.Header>
        <DemoNavbar
          endLeading={
            <DemoNavbarActionButton
              onClick={() => {
                state.setLabelError(null);
                state.setLabelDialogOpen(true);
              }}
            >
              <Tags className="size-4" aria-hidden />
              Labels
            </DemoNavbarActionButton>
          }
          fileName={state.fileName}
          loading={state.frameLoading}
          onOpenFile={(file) => void state.openImage(file)}
        />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left widthClass="w-72">
          <DemoAnnotatorLeft state={state} />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <DemoAnnotatorMain state={state} />
          </AppShell.Main>
          <AppShell.Dock>
            <DemoAnnotatorDock state={state} />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <DemoAnnotatorRight
            activeLabelId={state.activeLabelId}
            annotation={state.annotation.current}
            brushSize={state.brushSize}
            canEdit={state.canEdit}
            canRedo={state.annotation.canRedo}
            canUndo={state.annotation.canUndo}
            dirty={state.annotation.dirty}
            error={state.error}
            frameLoading={state.frameLoading}
            labels={state.labels}
            mode={state.mode}
            overlayOpacity={state.overlayOpacity}
            onBrushSizeChange={state.setBrushSize}
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
            onModeChange={state.setMode}
            onOverlayOpacityChange={state.setOverlayOpacity}
            onPaintLabelChange={state.setActiveLabelId}
            onRedo={state.annotation.redo}
            onUndo={state.annotation.undo}
          />
        </AppShell.Right>
      </AppShell.Body>
      <LabelCreationDialog
        error={state.labelError}
        labels={state.labels}
        open={state.labelDialogOpen}
        saveLabel="Apply labels"
        subtitle="Labels are kept in memory for this session."
        title="Edit labels"
        onOpenChange={state.setLabelDialogOpen}
        onSave={state.saveLabels}
      />
    </AppShell>
  );
}
