import { Button, DockSection, DockStrip, Text, dockLayoutClasses } from "@lisca/ui-native";
import { View } from "react-native";

import { instructionForStep } from "../state/studio-routes";
import type { StudioStep } from "../state/studio-store";

export function StudioInfoDock(props: {
  step: StudioStep;
  infoStep: number;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <Text className="text-center text-sm leading-snug text-foreground">
          {instructionForStep(props.step)}
        </Text>
      </DockSection>
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Action"
      >
        <View className={dockLayoutClasses.stack}>
          <Button
            className={dockLayoutClasses.button}
            disabled={props.infoStep === 1}
            size="sm"
            variant="outline"
            onPress={props.onBack}
          >
            <Text className="text-xs">Back</Text>
          </Button>
          <Button
            className={dockLayoutClasses.button}
            size="sm"
            variant="outline"
            onPress={props.onNext}
          >
            <Text className="text-xs">Next</Text>
          </Button>
        </View>
      </DockSection>
    </DockStrip>
  );
}
