import { ShellNavbar } from "@lisca/ui/shell";

import { useAnnotatePage } from "../state/annotate-page-context";

export function AnnotatorHeader() {
  const { state } = useAnnotatePage();

  return (
    <ShellNavbar.Annotator onPickWorkspace={() => state.setFilePickerOpen(true)} />
  );
}
