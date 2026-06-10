import { AppShell } from "@lisca/ui-native";

import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioAlignDock } from "../src/components/studio-align-dock";
import { StudioAlignMain } from "../src/components/studio-align-main";
import { StudioLeft } from "../src/components/studio-left";
import { useStudioAlignState } from "../src/state/use-studio-align-state";

export default function AlignRoute() {
  const alignState = useStudioAlignState();

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAlignMain state={alignState} />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAlignDock state={alignState} />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={STUDIO_NAV_WIDTH} />
      </AppShell.Body>
    </AppShell>
  );
}
