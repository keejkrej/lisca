import { AlignGridShapeToggle } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";
import { DemoAlignRoot, DemoNavbar, DEMO_SAMPLE_IMAGES, resolveSelectedSampleId, useDemoAlignState, useEmbeddedDemoPreset, type DemoSampleImageId } from "@lisca/web-demo";

import { DemoAlignContrastControls } from "./components/demo-align-contrast-controls";
import { DemoAlignGridControls } from "./components/demo-align-grid-controls";
import { DemoAlignMain } from "./components/demo-align-main";
import { DemoAlignSelectionControls } from "./components/demo-align-selection-controls";
import { DemoAlignDock, DemoInlineAlignToolbar } from "./components/demo-align-tool-section";

export type AlignDemoProps = {
  embedded?: boolean;
};

export function AlignDemo({ embedded = false }: AlignDemoProps) {
  return (
    <DemoAlignRoot embedded={embedded} persist={!embedded}>
      <AlignDemoView embedded={embedded} />
    </DemoAlignRoot>
  );
}

function AlignDemoView({ embedded }: { embedded: boolean }) {
  const state = useDemoAlignState();
  useEmbeddedDemoPreset(embedded, embedded ? "aligner" : null, Boolean(state.frame));

  const shell = (
    <AppShell>
      <AppShell.Header>
        <DemoNavbar
          fileName={state.fileName}
          loading={state.frameLoading}
          allowOpenFile={!embedded}
          showThemeToggle={!embedded}
          sampleImages={embedded ? DEMO_SAMPLE_IMAGES : undefined}
          selectedSampleId={embedded ? resolveSelectedSampleId(state.fileName) : null}
          onSampleChange={
            embedded
              ? (sampleId) => void state.openSampleImage(sampleId as DemoSampleImageId)
              : undefined
          }
          startTrailing={undefined}
          endLeading={
            embedded ? (
              <AlignGridShapeToggle
                className="w-[9rem]"
                disabled={!state.frame}
                shape={state.grid.shape}
                onShapeChange={(shape) =>
                  state.setGrid((grid) => ({
                    ...grid,
                    shape,
                  }))
                }
              />
            ) : undefined
          }
          onOpenFile={(file) => void state.openImage(file)}
        />
      </AppShell.Header>
      <AppShell.Body>
        {!embedded ? (
          <>
            <AppShell.Left widthClass="w-72">
              <div className="flex min-h-0 flex-col gap-2 p-3">
                <DemoAlignContrastControls state={state} />
              </div>
            </AppShell.Left>
            <AppShell.MainColumn>
              <AppShell.Main>
                <DemoAlignMain state={state} />
              </AppShell.Main>
              <AppShell.Dock>
                <DemoAlignDock state={state} />
              </AppShell.Dock>
            </AppShell.MainColumn>
            <AppShell.Right widthClass="w-72">
              <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
                <DemoAlignGridControls state={state} />
                <DemoAlignSelectionControls state={state} />
              </div>
            </AppShell.Right>
          </>
        ) : (
          <AppShell.MainColumn>
            <AppShell.Main>
              <DemoAlignMain embedded state={state} />
            </AppShell.Main>
            <DemoInlineAlignToolbar showDownload={false} showShapeToggle={false} state={state} />
          </AppShell.MainColumn>
        )}
      </AppShell.Body>
    </AppShell>
  );

  if (embedded) {
    return <div className="h-full min-h-0">{shell}</div>;
  }

  return shell;
}
