import { AnnotationModeToggle, LabelCreationDialog } from "@lisca/ui/features";
import { RailSidebar } from "@lisca/ui/shell";
import {
  DemoAnnotatorRoot,
  DemoNavbar,
  DemoShell,
  DEMO_SAMPLE_IMAGES,
  resolveSelectedSampleId,
  useDemoAnnotatorState,
  useEmbeddedDemoPreset,
  type DemoSampleImageId,
} from "@lisca/web-demo";
import { Show } from "solid-js";

import { DemoAnnotatorLeft } from "./components/demo-annotator-left";
import { DemoAnnotatorMain } from "./components/demo-annotator-main";
import { DemoAnnotatorRight } from "./components/demo-annotator-right";
import { DemoAnnotatorSaveSection } from "./components/demo-annotator-save-section";
import { DemoInlineAnnotatorToolbar } from "./components/demo-annotator-tool-section";

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
    () => props.embedded,
    () => (props.embedded ? "annotator" : null),
    () => Boolean(state().frame),
  );

  const navbar = (
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
  );

  const shell = (
    <Show
      when={!props.embedded}
      fallback={
        <DemoShell>
          <DemoShell.Header>{navbar}</DemoShell.Header>
          <DemoShell.Body>
            <DemoShell.MainColumn>
              <DemoShell.Main>
                <DemoAnnotatorMain embedded state={state} />
              </DemoShell.Main>
              <DemoInlineAnnotatorToolbar embedded state={state} />
            </DemoShell.MainColumn>
          </DemoShell.Body>
        </DemoShell>
      }
    >
      <DemoShell>
        <DemoShell.Header>{navbar}</DemoShell.Header>
        <DemoShell.Body>
          <DemoShell.Left widthClass="w-64">
            <DemoAnnotatorLeft state={state} />
          </DemoShell.Left>
          <DemoShell.MainColumn>
            <DemoShell.Main>
              <DemoAnnotatorMain state={state} />
            </DemoShell.Main>
          </DemoShell.MainColumn>
          <DemoShell.Right widthClass="w-64">
            <RailSidebar>
              <DemoAnnotatorRight state={state} />
              <DemoAnnotatorSaveSection state={state} />
            </RailSidebar>
          </DemoShell.Right>
        </DemoShell.Body>
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
      </DemoShell>
    </Show>
  );

  return (
    <Show when={props.embedded} fallback={shell}>
      <div class="h-full min-h-0">{shell}</div>
    </Show>
  );
}
