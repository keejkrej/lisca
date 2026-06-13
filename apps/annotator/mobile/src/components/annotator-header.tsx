import { Button, ShellNavbar, Text } from "@lisca/ui-native";
import { View } from "react-native";

import { useAnnotateShell } from "../state/annotate-page-selectors";

export function AnnotatorHeader() {
  const shell = useAnnotateShell();

  return (
    <View className="flex-1 justify-center">
      <ShellNavbar.Annotator
        endLeading={
          <Button
            disabled={!shell.workspacePath}
            size="sm"
            variant="outline"
            onPress={shell.openLabelDialog}
          >
            <Text className="text-sm">Create labels</Text>
          </Button>
        }
        onPickWorkspace={() => shell.setFilePickerOpen(true)}
      />
    </View>
  );
}
