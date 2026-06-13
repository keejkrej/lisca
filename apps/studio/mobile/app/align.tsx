import { AppShell } from "@lisca/ui-native";

import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioAlignDock } from "../src/components/studio-align-dock";
import { StudioAlignMain } from "../src/components/studio-align-main";
import { StudioLeft } from "../src/components/studio-left";
import {
  StudioAlignPageProvider,
} from "../src/state/studio-align-page-context";

function AlignRouteContent() {
  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAlignMain />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAlignDock />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={STUDIO_NAV_WIDTH} />
      </AppShell.Body>
    </AppShell>
  );
}

export default function AlignRoute() {
  return (
    <StudioAlignPageProvider>
      <AlignRouteContent />
    </StudioAlignPageProvider>
  );
}
