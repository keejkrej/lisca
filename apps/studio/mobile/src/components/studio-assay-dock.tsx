import { Button, DockSection, DockStrip, Text, dockLayoutClasses } from "@lisca/ui-native";
import { View } from "react-native";
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
  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <Text className="text-center text-sm leading-5 text-foreground">
          {instructionForStep("chooseAssay")}
        </Text>
      </DockSection>
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Action"
      >
        <View className={dockLayoutClasses.stack}>
          <Button
            disabled={props.opening || props.pickerOpen}
            label="Open assay"
            size="sm"
            className={dockLayoutClasses.button}
            variant="outline"
            onPress={props.onOpenAssay}
          />
          <Button
            label="Next"
            size="sm"
            className={dockLayoutClasses.button}
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

