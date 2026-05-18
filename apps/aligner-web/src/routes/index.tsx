import { AppShell } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";

import { AlignerDock } from "../components/aligner-dock";
import { AlignerHeader } from "../components/aligner-header";
import { AlignerLeft } from "../components/aligner-left";
import { AlignerMain } from "../components/aligner-main";
import { AlignerRight } from "../components/aligner-right";
import { useAlignState } from "../state/use-align-state";

export const Route = createFileRoute("/")({
  component: AlignPage,
});

function AlignPage() {
  const alignState = useAlignState();

  return (
    <AppShell>
      <AppShell.Header>
        <AlignerHeader onSourcePicked={alignState.setSource} />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left widthClass="w-72">
          <AlignerLeft alignState={alignState} />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <AlignerMain state={alignState} />
          </AppShell.Main>
          <AppShell.Dock>
            <AlignerDock alignState={alignState} />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <AlignerRight alignState={alignState} />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}
