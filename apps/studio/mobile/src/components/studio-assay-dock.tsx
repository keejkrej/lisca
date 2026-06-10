import { Button, DockSection, DockStrip, useShellTheme } from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { instructionForStep } from "../state/studio-routes";
import { useStudioStore } from "../state/studio-store";

export function StudioAssayDock(props: {
  opening: boolean;
  pickerOpen: boolean;
  onOpenAssay: () => void;
}) {
  const router = useRouter();
  const setInfoStep = useStudioStore((state) => state.setInfoStep);
  const { colors } = useShellTheme();

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <Text style={[styles.instructionText, { color: colors.foreground }]}>
          {instructionForStep("chooseAssay")}
        </Text>
      </DockSection>
      <DockSection style={styles.section} title="Action">
        <View style={styles.actions}>
          <Button
            disabled={props.opening || props.pickerOpen}
            label="Open assay"
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={props.onOpenAssay}
          />
          <Button
            label="Next"
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={() => {
              setInfoStep(1);
              router.push("/info");
            }}
          />
        </View>
      </DockSection>
    </DockStrip>
  );
}

const styles = StyleSheet.create({
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  section: {
    minWidth: 0,
  },
  actions: {
    gap: 8,
  },
  button: {
    width: "100%",
  },
});
