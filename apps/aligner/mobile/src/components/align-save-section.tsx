import { Button, DockSection, ReadonlyPathField, dockLayoutStyles } from "@lisca/ui-native";
import { View } from "react-native";

import type { AlignState } from "../state/use-align-state";

export function AlignSaveSection({ state }: { state: AlignState }) {
  const pos = state.selection.pos;
  const canSave = Boolean(state.workspacePath && state.frame && !state.cropping);
  const canCrop = Boolean(state.workspacePath && state.source && state.frame && !state.cropping);

  return (
    <DockSection
      contentStyle={dockLayoutStyles.content}
      style={dockLayoutStyles.section}
      title="Save"
    >
      <View style={dockLayoutStyles.stack}>
        <View style={dockLayoutStyles.cols3}>
          <View style={dockLayoutStyles.cell}>
            <ReadonlyPathField value={`bbox/Pos${pos}.csv`} />
          </View>
          <View style={dockLayoutStyles.cell}>
            <ReadonlyPathField value={`align/Pos${pos}.json`} />
          </View>
          <View style={dockLayoutStyles.cell}>
            <ReadonlyPathField value={`roi/Pos${pos}`} />
          </View>
        </View>
        <View style={dockLayoutStyles.cols3}>
          <View style={dockLayoutStyles.cell}>
            <Button
              disabled={!canSave || state.saving}
              label="Save"
              loading={state.saving}
              size="sm"
              variant="outline"
              onPress={() => void state.saveCurrent()}
            />
          </View>
          <View style={dockLayoutStyles.cell}>
            <Button
              disabled={!canCrop}
              label="Crop"
              size="sm"
              variant="outline"
              onPress={() => void state.cropCurrent()}
            />
          </View>
          <View style={dockLayoutStyles.cell}>
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
