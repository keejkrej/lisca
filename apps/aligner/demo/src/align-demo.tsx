import { AlignGridShapeToggle } from "@lisca/ui/features";
import { AppShell, RailSidebar } from "@lisca/ui/shell";
import {
  DemoAlignRoot,
  DemoNavbar,
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
        <AppShell>
          <AppShell.Header>{navbar}</AppShell.Header>
          <AppShell.Body>
            <AppShell.MainColumn>
              <AppShell.Main>
                <DemoAlignMain embedded state={state} />
              </AppShell.Main>
              <DemoInlineAlignToolbar showDownload={false} showShapeToggle={false} state={state} />
            </AppShell.MainColumn>
          </AppShell.Body>
        </AppShell>
      }
    >
      <AppShell variant="stage">
        <AppShell.Body>
          <AppShell.Left>
            <RailSidebar>
              <DemoAlignContrastControls state={state} />
              <DemoAlignToolSection state={state} />
            </RailSidebar>
          </AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.TopBar>{navbar}</AppShell.TopBar>
            <AppShell.Main>
              <DemoAlignMain state={state} />
            </AppShell.Main>
          </AppShell.MainColumn>
          <AppShell.Right>
            <RailSidebar>
              <DemoAlignGridControls state={state} />
              <DemoAlignSelectionControls state={state} />
              <DemoAlignSaveSection state={state} />
            </RailSidebar>
          </AppShell.Right>
        </AppShell.Body>
      </AppShell>
    </Show>
  );

  return (
    <Show when={props.embedded} fallback={shell}>
      <div class="h-full min-h-0">{shell}</div>
    </Show>
  );
}
