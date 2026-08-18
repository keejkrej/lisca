import { createLiscaWebApp } from "@lisca/web-app";
import { AppShell } from "@lisca/ui/shell";

import { AlignerAtomsProvider } from "./components/aligner-atoms-provider";
import { AlignerHeader } from "./components/aligner-header";
import { AlignerLeft } from "./components/aligner-left";
import { AlignerMain } from "./components/aligner-main";
import { AlignerRight } from "./components/aligner-right";
import { AlignerWorkSessionGate } from "./components/aligner-work-session-gate";
import "./index.css";
import { alignerHostOperations } from "./api/aligner-port";
import { AlignPageProvider } from "./state/align-page-context";

createLiscaWebApp({
  App: AlignApp,
  defaultPort: 8765,
  appId: "aligner",
  AtomsProvider: AlignerAtomsProvider,
  probe: () => alignerHostOperations.userHomeDirectory(),
});

function AlignApp() {
  return (
    <AlignerWorkSessionGate>
      <AlignPageProvider>
        <AppShell variant="stage">
          <AppShell.Body>
            <AppShell.Left>
              <AlignerLeft />
            </AppShell.Left>
            <AppShell.MainColumn>
              <AppShell.TopBar>
                <AlignerHeader />
              </AppShell.TopBar>
              <AppShell.Main>
                <AlignerMain />
              </AppShell.Main>
            </AppShell.MainColumn>
            <AppShell.Right>
              <AlignerRight />
            </AppShell.Right>
          </AppShell.Body>
        </AppShell>
      </AlignPageProvider>
    </AlignerWorkSessionGate>
  );
}
