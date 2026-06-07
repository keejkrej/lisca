import { AppShell } from "@lisca/ui-native";

import { AlignerDock } from "../src/components/aligner-dock";
import { AlignerHeader } from "../src/components/aligner-header";
import { AlignerLeft } from "../src/components/aligner-left";
import { AlignerMain } from "../src/components/aligner-main";
import { AlignerRight } from "../src/components/aligner-right";
import { useAlignState } from "../src/state/use-align-state";

export default function IndexRoute() {
  const alignState = useAlignState();

  return (
    <AppShell>
      <AppShell.Header>
        <AlignerHeader onSourcePicked={alignState.setSource} />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left width={288}>
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
        <AppShell.Right width={288}>
          <AlignerRight alignState={alignState} />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}
