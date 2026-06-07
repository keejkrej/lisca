import { HostFilePickerDialog, LabelCreationDialog } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";

import { annotatorHostOperations } from "../api/annotator-port";
import { useRoiPage } from "../state/roi-page-context";
import { AnnotatorDock } from "./annotator-dock";
import { AnnotatorHeader } from "./annotator-header";
import { AnnotatorLeft } from "./annotator-left";
import { AnnotatorMain } from "./annotator-main";
import { AnnotatorRight } from "./annotator-right";

export function RoiPage() {
  const { page } = useRoiPage();

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
        open={page.filePickerOpen}
        title="Workspace folder"
        onOpenChange={page.setFilePickerOpen}
        onPickDirectory={page.pickWorkspace}
        onPickFile={() => undefined}
      />
      <LabelCreationDialog
        error={page.labelError}
        labels={page.labels}
        open={page.labelDialogOpen}
        saving={page.saveLabelsPending}
        workspacePath={page.workspacePath}
        onOpenChange={page.setLabelDialogOpen}
        onSave={(nextLabels) => void page.handleSaveLabels(nextLabels)}
      />
    </AppShell>
  );
}
