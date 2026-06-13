import { ActivityIndicator } from "react-native";
import { View } from "react-native";

import { Button, DockSection, ReadonlyPathField, Text, dockLayoutClasses } from "@lisca/ui-native";

import type { AlignState } from "../state/use-align-state";

export function AlignSaveSection({ state }: { state: AlignState }) {
  const pos = state.selection.pos;
  const canSave = Boolean(state.workspacePath && state.frame && !state.cropping);
  const canCrop = Boolean(state.workspacePath && state.source && state.frame && !state.cropping);

  return (
    <DockSection
      className={dockLayoutClasses.section}
      contentClassName={dockLayoutClasses.content}
      title="Save"
    >
      <View className={dockLayoutClasses.stack}>
        <View className={dockLayoutClasses.cols3}>
          <View className={dockLayoutClasses.cell}>
            <ReadonlyPathField
              accessibilityLabel={`Output path bbox/Pos${pos}.csv`}
              value={`bbox/Pos${pos}.csv`}
            />
          </View>
          <View className={dockLayoutClasses.cell}>
            <ReadonlyPathField
              accessibilityLabel={`Output path align/Pos${pos}.json`}
              value={`align/Pos${pos}.json`}
            />
          </View>
          <View className={dockLayoutClasses.cell}>
            <ReadonlyPathField
              accessibilityLabel={`Output path roi/Pos${pos}`}
              value={`roi/Pos${pos}`}
            />
          </View>
        </View>
        <View className={dockLayoutClasses.cols3}>
          <View className={dockLayoutClasses.cell}>
            <Button
              disabled={!canSave || state.saving}
              size="sm"
              variant="outline"
              onPress={() => void state.saveCurrent()}
            >
              {state.saving ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-xs">Save</Text>
              )}
            </Button>
          </View>
          <View className={dockLayoutClasses.cell}>
            <Button
              disabled={!canCrop}
              size="sm"
              variant="outline"
              onPress={() => void state.cropCurrent()}
            >
              <Text className="text-xs">Crop</Text>
            </Button>
          </View>
          <View className={dockLayoutClasses.cell}>
            <Button
              disabled={!state.workspacePath || !state.source || state.cropping}
              size="sm"
              variant="outline"
              onPress={() => void state.cropBatch()}
            >
              <Text className="text-xs">Batch</Text>
            </Button>
          </View>
        </View>
      </View>
    </DockSection>
  );
}
