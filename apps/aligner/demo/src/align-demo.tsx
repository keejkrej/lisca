import { AlignGridShapeToggle } from "@lisca/ui/features";
import { RailSidebar } from "@lisca/ui/shell";
import {
  DemoAlignRoot,
  DemoNavbar,
  DemoShell,
  DEMO_SAMPLE_IMAGES,
  resolveSelectedSampleId,
  useDemoAlignState,
  useEmbeddedDemoPreset,
  type DemoSampleImageId,
} from "@lisca/web-demo";
import { Show } from "solid-js";

import { DemoAlignContrastControls } from "./components/demo-align-contrast-controls";
import { DemoAlignGridControls } from "./components/demo-align-grid-controls";
import { DemoAlignMain } from "./components/demo-align-main";
import { DemoAlignSaveSection } from "./components/demo-align-save-section";
import { DemoAlignSelectionControls } from "./components/demo-align-selection-controls";
import { DemoAlignToolSection, DemoInlineAlignToolbar } from "./components/demo-align-tool-section";

export type AlignDemoProps = {
  embedded?: boolean;
};

export function AlignDemo(props: AlignDemoProps) {
  return (
    <DemoAlignRoot embedded={props.embedded ?? false} persist={!(props.embedded ?? false)}>
      <AlignDemoView embedded={props.embedded ?? false} />
    </DemoAlignRoot>
  );
}

function AlignDemoView(props: { embedded: boolean }) {
  const state = useDemoAlignState();
  useEmbeddedDemoPreset(
    () => props.embedded,
    () => (props.embedded ? "aligner" : null),
    () => Boolean(state().frame),
  );

  const navbar = (
    <DemoNavbar
      fileName={state().fileName}
      loading={state().frameLoading}
      allowOpenFile={!props.embedded}
      showThemeToggle={!props.embedded}
      sampleImages={props.embedded ? DEMO_SAMPLE_IMAGES : undefined}
      selectedSampleId={props.embedded ? resolveSelectedSampleId(state().fileName) : null}
      onSampleChange={
        props.embedded
          ? (sampleId) => void state().openSampleImage(sampleId as DemoSampleImageId)
          : undefined
      }
      startTrailing={undefined}
      endLeading={
        props.embedded ? (
          <AlignGridShapeToggle
            class="w-[9rem]"
            disabled={!state().frame}
            shape={state().grid.shape}
            onShapeChange={(shape) =>
              state().setGrid((grid) => ({
                ...grid,
                shape,
              }))
            }
          />
        ) : undefined
      }
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
                <DemoAlignMain embedded state={state} />
              </DemoShell.Main>
              <DemoInlineAlignToolbar showDownload={false} showShapeToggle={false} state={state} />
            </DemoShell.MainColumn>
          </DemoShell.Body>
        </DemoShell>
      }
    >
      <DemoShell>
        <DemoShell.Header>{navbar}</DemoShell.Header>
        <DemoShell.Body>
          <DemoShell.Left widthClass="w-64">
            <RailSidebar>
              <DemoAlignContrastControls state={state} />
              <DemoAlignToolSection state={state} />
            </RailSidebar>
          </DemoShell.Left>
          <DemoShell.MainColumn>
            <DemoShell.Main>
              <DemoAlignMain state={state} />
            </DemoShell.Main>
          </DemoShell.MainColumn>
          <DemoShell.Right widthClass="w-64">
            <RailSidebar>
              <DemoAlignGridControls state={state} />
              <DemoAlignSelectionControls state={state} />
              <DemoAlignSaveSection state={state} />
            </RailSidebar>
          </DemoShell.Right>
        </DemoShell.Body>
      </DemoShell>
    </Show>
  );

  return (
    <Show when={props.embedded} fallback={shell}>
      <div class="h-full min-h-0">{shell}</div>
    </Show>
  );
}
