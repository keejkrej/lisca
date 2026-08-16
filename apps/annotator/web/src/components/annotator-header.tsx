import { ShellNavbar } from "@lisca/ui/shell";

import { useAnnotateShell } from "../state/annotate-page-selectors";
import { AnnotatorTaskCenter } from "./annotator-task-center";

export function AnnotatorHeader() {
  const shell = useAnnotateShell();

  return (
    <ShellNavbar.Annotator
      appearance="stage"
      endLeading={<AnnotatorTaskCenter />}
      onPickWorkspace={() => shell.setFilePickerOpen(true)}
    />
  );
}
