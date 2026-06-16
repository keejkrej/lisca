import { ShellNavbar } from "@lisca/ui-native";
import { View } from "react-native";

import { useAnnotateShell } from "../state/annotate-page-selectors";

export function AnnotatorHeader() {
  const shell = useAnnotateShell();

  return (
    <View className="flex-1 justify-center">
      <ShellNavbar.Annotator onPickWorkspace={() => shell.setFilePickerOpen(true)} />
    </View>
  );
}
