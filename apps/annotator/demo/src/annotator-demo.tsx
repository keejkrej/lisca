import { LabelCreationDialog } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";
import { DemoNavbar, DemoNavbarActionButton } from "@lisca/web-demo";
import { Tags } from "lucide-react";

import { DemoAnnotatorDock } from "./components/demo-annotator-dock";
import { DemoAnnotatorLeft } from "./components/demo-annotator-left";
import { DemoAnnotatorMain } from "./components/demo-annotator-main";
import { DemoAnnotatorRight } from "./components/demo-annotator-right";
import { DemoInlineAnnotatorToolbar } from "./components/demo-annotator-tool-section";
import { useDemoAnnotatorState } from "./state/use-demo-annotator-state";
import { createEmptyMask } from "./utils/annotation-utils";

export type AnnotatorDemoProps = {
  embedded?: boolean;
};

export function AnnotatorDemo({ embedded = false }: AnnotatorDemoProps) {
  const state = useDemoAnnotatorState();

  const shell = (
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
          showThemeToggle={!embedded}
          onOpenFile={(file) => void state.openImage(file)}
        />
      </AppShell.Header>
      <AppShell.Body>
        {!embedded ? (
          <>
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
          </>
        ) : (
          <AppShell.MainColumn>
            <AppShell.Main>
              <DemoAnnotatorMain state={state} />
            </AppShell.Main>
            <DemoInlineAnnotatorToolbar state={state} />
          </AppShell.MainColumn>
        )}
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

  if (embedded) {
    return <div className="h-full min-h-0">{shell}</div>;
  }

  return shell;
}
