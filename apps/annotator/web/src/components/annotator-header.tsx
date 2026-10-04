import { ShellNavbar } from "@lisca/ui/shell";

import { useAnnotateShell } from "../state/annotate-page-selectors";

/** Annotator shell header. Crop and analysis tasks live in Studio, not here. */
export function AnnotatorHeader() {
  const shell = useAnnotateShell();

  return (
    <ShellNavbar.Annotator
      appearance="stage"
      onPickWorkspace={() => shell.setFilePickerOpen(true)}
    />
  );
}
