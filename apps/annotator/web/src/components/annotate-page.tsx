import { useWorkSessionRecents } from "@lisca/client/session/work-session-app-gate";
import { HostFilePickerDialog, LabelCreationDialog } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";

import { annotatorHostOperations } from "../api/annotator-port";
import { useAnnotateShell } from "../state/annotate-page-selectors";
import { AnnotatorHeader } from "./annotator-header";
import { AnnotatorLeft } from "./annotator-left";
import { AnnotatorMain } from "./annotator-main";
import { AnnotatorRight } from "./annotator-right";

export function AnnotatePage() {
  const shell = useAnnotateShell();
  const recents = useWorkSessionRecents();

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left>
          <AnnotatorLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.TopBar>
            <AnnotatorHeader />
          </AppShell.TopBar>
          <AppShell.Main>
            <AnnotatorMain />
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right>
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
        recentItems={shell.filePickerOpen ? recents.items() : undefined}
        onPickRecent={(path) => {
          shell.setFilePickerOpen(false);
          void recents.restore(path).then((restored) => {
            if (!restored) shell.pickWorkspace(path);
          });
        }}
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
