import { Button, DockSection, ReadonlyPathField, dockLayoutClasses } from "@lisca/ui-native";
import { View } from "react-native";

import type { AlignState } from "../state/use-align-state";

export function AlignSaveSection({ state }: { state: AlignState }) {
  const pos = state.selection.pos;
  const canSave = Boolean(state.workspacePath && state.frame && !state.cropping);
  const canCrop = Boolean(state.workspacePath && state.source && state.frame && !state.cropping);

  return (
    <DockSection className={dockLayoutClasses.section} contentClassName={dockLayoutClasses.content} title="Save">
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
              label="Save"
              loading={state.saving}
              size="sm"
              variant="outline"
              onPress={() => void state.saveCurrent()}
            />
          </View>
          <View className={dockLayoutClasses.cell}>
            <Button
              disabled={!canCrop}
              label="Crop"
              size="sm"
              variant="outline"
              onPress={() => void state.cropCurrent()}
            />
          </View>
          <View className={dockLayoutClasses.cell}>
            <Button
              disabled={!state.workspacePath || !state.source || state.cropping}
              label="Batch"
              size="sm"
              variant="outline"
              onPress={() => void state.cropBatch()}
            />
          </View>
        </View>
      </View>
    </DockSection>
  );
}
