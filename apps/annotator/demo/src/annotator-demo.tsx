import { AnnotationModeToggle, LabelCreationDialog } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";
import {
  DemoAnnotatorRoot,
  DemoNavbar,
  DEMO_SAMPLE_IMAGES,
  resolveSelectedSampleId,
  useDemoAnnotatorState,
  useEmbeddedDemoPreset,
  type DemoSampleImageId,
} from "@lisca/web-demo";
import { Show } from "solid-js";

import { DemoAnnotatorDock } from "./components/demo-annotator-dock";
import { DemoAnnotatorLeft } from "./components/demo-annotator-left";
import { DemoAnnotatorMain } from "./components/demo-annotator-main";
import { DemoAnnotatorRight } from "./components/demo-annotator-right";
import { DemoInlineAnnotatorToolbar } from "./components/demo-annotator-tool-section";
import { createEmptyMask } from "./utils/annotation-utils";

export type AnnotatorDemoProps = {
  embedded?: boolean;
};

export function AnnotatorDemo(props: AnnotatorDemoProps) {
  return (
    <DemoAnnotatorRoot embedded={props.embedded ?? false} persist={!(props.embedded ?? false)}>
      <AnnotatorDemoView embedded={props.embedded ?? false} />
    </DemoAnnotatorRoot>
  );
}

function AnnotatorDemoView(props: { embedded: boolean }) {
  const state = useDemoAnnotatorState();
  useEmbeddedDemoPreset(
    props.embedded,
    props.embedded ? "annotator" : null,
    Boolean(state().frame),
  );

  const shell = (
    <AppShell>
      <AppShell.Header>
        <DemoNavbar
          allowOpenFile={!props.embedded}
          sampleImages={props.embedded ? DEMO_SAMPLE_IMAGES : undefined}
          selectedSampleId={props.embedded ? resolveSelectedSampleId(state().fileName) : null}
          onSampleChange={
            props.embedded
              ? (sampleId) => void state().openSampleImage(sampleId as DemoSampleImageId)
              : undefined
          }
          endLeading={
            props.embedded ? (
              <AnnotationModeToggle
                class="w-[14rem]"
                mode={state().mode}
                onModeChange={state().setMode}
              />
            ) : undefined
          }
          fileName={state().fileName}
          loading={state().frameLoading}
          showThemeToggle={!props.embedded}
          onOpenFile={(file) => void state().openImage(file)}
        />
      </AppShell.Header>
      <AppShell.Body>
        <Show
          when={!props.embedded}
          fallback={
            <AppShell.MainColumn>
              <AppShell.Main>
                <DemoAnnotatorMain embedded state={state} />
              </AppShell.Main>
              <DemoInlineAnnotatorToolbar embedded state={state} />
            </AppShell.MainColumn>
          }
        >
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
              activeLabelId={state().activeLabelId}
              annotation={state().annotation.current}
              brushSize={state().brushSize}
              canEdit={state().canEdit}
              canRedo={state().annotation.canRedo}
              canUndo={state().annotation.canUndo}
              dirty={state().annotation.dirty}
              error={state().error}
              frameLoading={state().frameLoading}
              labels={state().labels}
              mode={state().mode}
              overlayOpacity={state().overlayOpacity}
              onBrushSizeChange={state().setBrushSize}
              onClassificationChange={(labelId) =>
                state().annotation.commit({
                  classificationLabelId: labelId,
                  mask: state().annotation.current.mask,
                })
              }
              onClear={() => {
                const current = state();
                if (!current.frame) return;
                current.annotation.commit({
                  classificationLabelId: current.annotation.current.classificationLabelId,
                  mask: createEmptyMask(current.frame.width, current.frame.height),
                });
              }}
              onDiscard={state().annotation.discard}
              onModeChange={state().setMode}
              onOverlayOpacityChange={state().setOverlayOpacity}
              onPaintLabelChange={state().setActiveLabelId}
              onRedo={state().annotation.redo}
              onUndo={state().annotation.undo}
              onOpenLabelDialog={() => {
                state().setLabelError(null);
                state().setLabelDialogOpen(true);
              }}
            />
          </AppShell.Right>
        </Show>
      </AppShell.Body>
      <Show when={!props.embedded}>
        <LabelCreationDialog
          error={state().labelError}
          labels={state().labels}
          open={state().labelDialogOpen}
          saveLabel="Apply labels"
          subtitle="Labels are restored when you refresh this demo page."
          title="Edit labels"
          onOpenChange={state().setLabelDialogOpen}
          onSave={state().saveLabels}
        />
      </Show>
    </AppShell>
  );

  return (
    <Show when={props.embedded} fallback={shell}>
      <div class="h-full min-h-0">{shell}</div>
    </Show>
  );
}
