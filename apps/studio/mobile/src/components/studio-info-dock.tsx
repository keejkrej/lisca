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
        <Text className="text-center text-sm leading-5 text-foreground">
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
            disabled={props.infoStep === 1}
            label="Back"
            size="sm"
            className={dockLayoutClasses.button}
            variant="outline"
            onPress={props.onBack}
          />
          <Button
            label="Next"
            size="sm"
            className={dockLayoutClasses.button}
            variant="outline"
            onPress={props.onNext}
          />
        </View>
      </DockSection>
    </DockStrip>
  );
}

