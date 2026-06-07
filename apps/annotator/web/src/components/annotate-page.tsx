import { HostFilePickerDialog, LabelCreationDialog } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";

import { annotatorHostOperations } from "../api/annotator-port";
import { useAnnotatePage } from "../state/annotate-page-context";
import { AnnotatorDock } from "./annotator-dock";
import { AnnotatorHeader } from "./annotator-header";
import { AnnotatorLeft } from "./annotator-left";
import { AnnotatorMain } from "./annotator-main";
import { AnnotatorRight } from "./annotator-right";

export function AnnotatePage() {
  const { state } = useAnnotatePage();

  return (
    <AppShell>
      <AppShell.Header>
        <AnnotatorHeader />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left widthClass="w-72">
          <AnnotatorLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <AnnotatorMain />
          </AppShell.Main>
          <AppShell.Dock>
            <AnnotatorDock />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <AnnotatorRight />
        </AppShell.Right>
      </AppShell.Body>
      <HostFilePickerDialog
        hostPort={annotatorHostOperations}
        mode="workspace"
        open={state.filePickerOpen}
        title="Workspace folder"
        onOpenChange={state.setFilePickerOpen}
        onPickDirectory={state.pickWorkspace}
        onPickFile={() => undefined}
      />
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
