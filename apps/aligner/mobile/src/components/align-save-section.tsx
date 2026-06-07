import { Button, ReadonlyPathField, Section } from "@lisca/ui-native";
import { StyleSheet, View } from "react-native";

import type { AlignState } from "../state/use-align-state";

export function AlignSaveSection({ state }: { state: AlignState }) {
  const pos = state.selection.pos;
  const canSave = Boolean(state.workspacePath && state.frame && !state.cropping);
  const canCrop = Boolean(state.workspacePath && state.source && state.frame && !state.cropping);

  return (
    <Section title="Save">
      <View style={styles.paths}>
        <ReadonlyPathField value={`bbox/Pos${pos}.csv`} />
        <ReadonlyPathField value={`align/Pos${pos}.json`} />
        <ReadonlyPathField value={`roi/Pos${pos}`} />
      </View>
      <View style={styles.row}>
        <Button label="Save" variant="outline" disabled={!canSave || state.saving} onPress={() => void state.saveCurrent()} />
        <Button label="Crop" variant="outline" disabled={!canCrop} onPress={() => void state.cropCurrent()} />
        <Button
          label="Batch"
          variant="outline"
          disabled={!state.workspacePath || !state.source || state.cropping}
          onPress={() => void state.cropBatch()}
        />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  paths: { flexDirection: "row", gap: 8 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});
