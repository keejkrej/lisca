import { AppShell, LabelCreationDialog } from "@lisca/ui-native";

import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioAnnotateDock } from "../src/components/studio-annotate-dock";
import { StudioAnnotateLeft } from "../src/components/studio-annotate-left";
import { StudioAnnotateMain } from "../src/components/studio-annotate-main";
import { StudioAnnotateRight } from "../src/components/studio-annotate-right";
import { StudioLeft } from "../src/components/studio-left";
import { StudioAnnotatePageProvider } from "../src/state/studio-annotate-page-context";
import { useStudioAnnotateShell } from "../src/state/studio-annotate-page-selectors";

const ANNOTATE_PANEL_WIDTH = 288;

function AnnotateRouteContent() {
  const shell = useStudioAnnotateShell();

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.Left width={ANNOTATE_PANEL_WIDTH}>
          <StudioAnnotateLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAnnotateMain />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAnnotateDock />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={ANNOTATE_PANEL_WIDTH}>
          <StudioAnnotateRight />
        </AppShell.Right>
      </AppShell.Body>
      <LabelCreationDialog
        error={shell.labelError}
        labels={shell.labels}
        open={shell.labelDialogOpen}
        saving={shell.saveLabelsPending}
        workspacePath={shell.workspacePath}
        onOpenChange={shell.setLabelDialogOpen}
        onSave={(nextLabels) => void shell.handleSaveLabels(nextLabels)}
      />
    </AppShell>
  );
}

export default function AnnotateRoute() {
  return (
    <StudioAnnotatePageProvider>
      <AnnotateRouteContent />
    </StudioAnnotatePageProvider>
  );
}
