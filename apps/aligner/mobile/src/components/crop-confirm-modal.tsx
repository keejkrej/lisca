import { Button, DialogSurface, ModalScrim } from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import type { AlignState } from "../state/use-align-state";

export function CropConfirmModal({ state }: { state: AlignState }) {
  const confirm = state.cropConfirm;
  if (!confirm) return null;

  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return (
    <ModalScrim open onClose={state.cancelCropConfirm}>
      <DialogSurface>
        <Text style={styles.title}>ROI output already exists</Text>
        <Text style={styles.body}>
          {confirm.kind === "single"
            ? `roi/Pos${confirm.positions[0]} already exists. Overwrite the existing cropped ROI files for this position?`
            : `${confirm.existingPositions.length} of ${confirm.positions.length} saved positions already have ROI output.`}
        </Text>
        {confirm.kind === "batch" ? <Text style={styles.list}>{existingList}</Text> : null}
        <View style={styles.actions}>
          <Button label="Cancel" variant="outline" onPress={state.cancelCropConfirm} />
          {confirm.kind === "batch" ? (
            <Button label="Skip Existing" variant="outline" onPress={state.skipExistingCrop} />
          ) : null}
          <Button label="Overwrite" onPress={state.confirmCropOverwrite} />
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "600" },
  body: { fontSize: 14, lineHeight: 20 },
  list: { fontSize: 12, maxHeight: 80 },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" },
});
