import { Button, DockSection } from "@lisca/ui-native";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { instructionForStep } from "../state/studio-routes";
import { useStudioStore } from "../state/studio-store";
import { StudioDockStrip } from "./studio-dock-strip";
import { StudioInstructionSection } from "./studio-instruction-section";

export function StudioAssayDock(props: {
  opening: boolean;
  pickerOpen: boolean;
  onOpenAssay: () => void;
}) {
  const router = useRouter();
  const setInfoStep = useStudioStore((state) => state.setInfoStep);

  return (
    <StudioDockStrip panels={2}>
      <StudioInstructionSection>{instructionForStep("chooseAssay")}</StudioInstructionSection>
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
    </StudioDockStrip>
  );
}

const styles = StyleSheet.create({
  section: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    gap: 8,
    width: "100%",
  },
  button: {
    width: "100%",
  },
});
