import { AppShell } from "@lisca/ui-native";

import { AlignPageProvider } from "../state/align-page-context";
import { AlignerDock } from "./aligner-dock";
import { AlignerHeader } from "./aligner-header";
import { AlignerLeft } from "./aligner-left";
import { AlignerMain } from "./aligner-main";
import { AlignerRight } from "./aligner-right";

export function AlignPage() {
  return (
    <AlignPageProvider>
      <AppShell>
        <AppShell.Header>
          <AlignerHeader />
        </AppShell.Header>
        <AppShell.Body>
          <AppShell.Left width={288}>
            <AlignerLeft />
          </AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.Main>
              <AlignerMain />
            </AppShell.Main>
            <AppShell.Dock>
              <AlignerDock />
            </AppShell.Dock>
          </AppShell.MainColumn>
          <AppShell.Right width={288}>
            <AlignerRight />
          </AppShell.Right>
        </AppShell.Body>
      </AppShell>
    </AlignPageProvider>
  );
}
