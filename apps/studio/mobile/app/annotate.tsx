import { AppShell } from "@lisca/ui-native";

import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioAnnotateDock } from "../src/components/studio-annotate-dock";
import { StudioAnnotateLeft } from "../src/components/studio-annotate-left";
import { StudioAnnotateMain } from "../src/components/studio-annotate-main";
import { StudioAnnotateRight } from "../src/components/studio-annotate-right";
import { StudioLeft } from "../src/components/studio-left";
import { LabelCreationDialog } from "../src/components/label-creation-dialog";
import { useStudioAnnotateState } from "../src/state/use-studio-annotate-state";

const ANNOTATE_PANEL_WIDTH = 288;

export default function AnnotateRoute() {
  const state = useStudioAnnotateState();

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.Left width={ANNOTATE_PANEL_WIDTH}>
          <StudioAnnotateLeft state={state} />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAnnotateMain state={state} />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAnnotateDock state={state} />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={ANNOTATE_PANEL_WIDTH}>
          <StudioAnnotateRight state={state} />
        </AppShell.Right>
      </AppShell.Body>
      <LabelCreationDialog
        error={state.labelError}
        labels={state.labels}
        open={state.labelDialogOpen}
        saving={state.saveLabelsPending}
        workspacePath={state.workspacePath}
        onOpenChange={state.setLabelDialogOpen}
        onSave={(nextLabels) => void state.handleSaveLabels(nextLabels)}
      />
    </AppShell>
  );
}
