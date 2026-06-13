import { Button } from "@lisca/ui/components";
import { ShellNavbar } from "@lisca/ui/shell";

import { useAnnotateShell } from "../state/annotate-page-selectors";

export function AnnotatorHeader() {
  const shell = useAnnotateShell();

  return (
    <ShellNavbar.Annotator
      endLeading={
        <Button
          disabled={!shell.workspacePath}
          size="sm"
          type="button"
          variant="outline"
          onClick={shell.openLabelDialog}
        >
          Create labels
        </Button>
      }
      onPickWorkspace={() => shell.setFilePickerOpen(true)}
    />
  );
}
