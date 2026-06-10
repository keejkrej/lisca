import { AppShell } from "@lisca/ui-native";

import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioAnnotateDock } from "../src/components/studio-annotate-dock";
import { StudioAnnotateMain } from "../src/components/studio-annotate-main";
import { StudioLeft } from "../src/components/studio-left";
import { useStudioAnnotateState } from "../src/state/use-studio-annotate-state";

export default function AnnotateRoute() {
  const state = useStudioAnnotateState();

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAnnotateMain state={state} />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAnnotateDock state={state} />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={STUDIO_NAV_WIDTH} />
      </AppShell.Body>
    </AppShell>
  );
}
