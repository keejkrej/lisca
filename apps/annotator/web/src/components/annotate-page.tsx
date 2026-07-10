import { HostFilePickerDialog, LabelCreationDialog } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";

import { annotatorHostOperations } from "../api/annotator-port";
import { useAnnotateShell } from "../state/annotate-page-selectors";
import { AnnotatorDock } from "./annotator-dock";
import { AnnotatorHeader } from "./annotator-header";
import { AnnotatorLeft } from "./annotator-left";
import { AnnotatorMain } from "./annotator-main";
import { AnnotatorRight } from "./annotator-right";

export function AnnotatePage() {
  const shell = useAnnotateShell();

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
        open={shell.filePickerOpen}
        title="Workspace folder"
        onOpenChange={shell.setFilePickerOpen}
        onPickDirectory={shell.pickWorkspace}
        onPickFile={() => undefined}
      />
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