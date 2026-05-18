import { AppShell } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";

import { AlignCanvasPanel } from "../components/align-canvas-panel";
import { BottomPanel } from "../components/bottom-panel";
import { LeftPanel } from "../components/left-panel";
import { Navbar } from "../components/navbar";
import { RightPanel } from "../components/right-panel";
import { useAlignState } from "../state/use-align-state";

export const Route = createFileRoute("/")({
  component: AlignPage,
});

function AlignPage() {
  const alignState = useAlignState();

  return (
    <AppShell>
      <AppShell.Header>
        <Navbar onSourcePicked={alignState.setSource} />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left widthClass="w-72">
          <LeftPanel alignState={alignState} />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <AlignCanvasPanel state={alignState} />
          </AppShell.Main>
          <AppShell.Dock>
            <BottomPanel alignState={alignState} />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <RightPanel alignState={alignState} />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}
