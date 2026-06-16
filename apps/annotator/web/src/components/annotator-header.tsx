import { ShellNavbar } from "@lisca/ui/shell";

import { useAnnotateShell } from "../state/annotate-page-selectors";

export function AnnotatorHeader() {
  const shell = useAnnotateShell();

  return (
    <ShellNavbar.Annotator onPickWorkspace={() => shell.setFilePickerOpen(true)} />
  );
}
