import { Button, ShellNavbar } from "@lisca/ui-native";
import { StyleSheet, View } from "react-native";

export function AnnotatorHeader(props: {
  workspacePath: string | null;
  onCreateLabels: () => void;
  onPickWorkspace: () => void;
}) {
  return (
    <View style={styles.root}>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
  },
});
