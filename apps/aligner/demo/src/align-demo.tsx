import { AppShell, DockStrip } from "@lisca/ui/shell";
import { DemoNavbar } from "@lisca/web-demo";

import { DemoAlignContrastControls } from "./components/demo-align-contrast-controls";
import { DemoAlignGridControls } from "./components/demo-align-grid-controls";
import { DemoAlignMain } from "./components/demo-align-main";
import { DemoAlignSaveSection } from "./components/demo-align-save-section";
import { DemoAlignSelectionControls } from "./components/demo-align-selection-controls";
import { DemoAlignToolSection } from "./components/demo-align-tool-section";
import { useDemoAlignState } from "./state/use-demo-align-state";

export type AlignDemoProps = {
  embedded?: boolean;
};

export function AlignDemo({ embedded = false }: AlignDemoProps) {
  const state = useDemoAlignState();

  const shell = (
    <AppShell>
      <AppShell.Header>
        <DemoNavbar
          fileName={state.fileName}
          loading={state.frameLoading}
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
                <DockStrip panels={2}>
                  <DemoAlignToolSection state={state} />
                  <DemoAlignSaveSection state={state} />
                </DockStrip>
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
              <DemoAlignMain state={state} />
            </AppShell.Main>
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
