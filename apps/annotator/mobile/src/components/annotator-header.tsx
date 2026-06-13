import { Button, ShellNavbar } from "@lisca/ui-native";
import { View } from "react-native";

export function AnnotatorHeader(props: {
  workspacePath: string | null;
  onCreateLabels: () => void;
  onPickWorkspace: () => void;
}) {
  return (
    <View className="flex-1 justify-center">
      <ShellNavbar.Annotator
        endLeading={
          <Button
            disabled={!props.workspacePath}
            label="Create labels"
            size="sm"
            variant="outline"
            onPress={props.onCreateLabels}
          />
        }
        onPickWorkspace={props.onPickWorkspace}
      />
    </View>
  );
}
