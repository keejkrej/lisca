import { Button, DialogSurface, ModalScrim, useShellTheme } from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioCropStartModal({ state }: { state: StudioAlignState }) {
  const { colors } = useShellTheme();
  const confirm = state.cropStartConfirm;
  if (!confirm) return null;

  return (
    <ModalScrim open onClose={state.cancelCropStartConfirm}>
      <DialogSurface>
        <Text style={[styles.title, { color: colors.foreground }]}>All positions aligned</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {`${confirm.positions.length} positions have saved alignment output. Start cropping ROI output now?`}
        </Text>
        <View style={styles.actions}>
          <Button label="Cancel" size="sm" variant="outline" onPress={state.cancelCropStartConfirm} />
          <Button label="Start" size="sm" onPress={state.startConfirmedCrop} />
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}

export function StudioCropConfirmModal({ state }: { state: StudioAlignState }) {
  const { colors } = useShellTheme();
  const confirm = state.cropConfirm;
  if (!confirm) return null;

  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return (
    <ModalScrim open onClose={state.cancelCropConfirm}>
      <DialogSurface>
        <Text style={[styles.title, { color: colors.foreground }]}>ROI output already exists</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {`${confirm.existingPositions.length} of ${confirm.positions.length} saved positions already have ROI output. Overwrite those folders or skip them and crop only the remaining positions.`}
        </Text>
        <Text numberOfLines={4} style={[styles.list, { color: colors.mutedForeground }]}>
          {existingList}
        </Text>
        <View style={styles.actions}>
          <Button label="Cancel" size="sm" variant="outline" onPress={state.cancelCropConfirm} />
          <Button label="Skip Existing" size="sm" variant="outline" onPress={state.skipExistingCrop} />
          <Button label="Overwrite" size="sm" onPress={state.confirmCropOverwrite} />
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 20 },
  list: { fontSize: 12, marginTop: 8 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 16,
  },
});
