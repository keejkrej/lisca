import { Button, ReadonlyPathField, Section } from "@lisca/ui-native";
import { StyleSheet, View } from "react-native";

import type { AlignState } from "../state/use-align-state";

export function AlignSaveSection({ state }: { state: AlignState }) {
  const pos = state.selection.pos;
  const canSave = Boolean(state.workspacePath && state.frame && !state.cropping);
  const canCrop = Boolean(state.workspacePath && state.source && state.frame && !state.cropping);

  return (
    <Section contentStyle={styles.content} style={styles.section} title="Save">
      <View style={styles.paths}>
        <ReadonlyPathField value={`bbox/Pos${pos}.csv`} />
        <ReadonlyPathField value={`align/Pos${pos}.json`} />
        <ReadonlyPathField value={`roi/Pos${pos}`} />
      </View>
      <View style={styles.actions}>
        <View style={styles.gridCell}>
          <Button
            disabled={!canSave || state.saving}
            label="Save"
            loading={state.saving}
            size="sm"
            variant="outline"
            onPress={() => void state.saveCurrent()}
          />
        </View>
        <View style={styles.gridCell}>
          <Button
            disabled={!canCrop}
            label="Crop"
            size="sm"
            variant="outline"
            onPress={() => void state.cropCurrent()}
          />
        </View>
        <View style={styles.gridCell}>
          <Button
            disabled={!state.workspacePath || !state.source || state.cropping}
            label="Batch"
            size="sm"
            variant="outline"
            onPress={() => void state.cropBatch()}
          />
        </View>
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  section: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    gap: 8,
  },
  paths: {
    flexDirection: "row",
    gap: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
});
