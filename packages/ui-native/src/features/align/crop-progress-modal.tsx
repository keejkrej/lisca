import type { CropRoiProgress } from "@lisca/contracts";
import { useCropProgressModal } from "@lisca/ui-headless/crop-progress-modal";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../../shell/chrome/buttons";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";
import { Spinner } from "../../shell/regions/panel";
import { useShellTheme } from "../../theme/shell-theme";
import { liscaType } from "../../theme/typography";

export type CropProgressModalProps = {
  progress: CropRoiProgress | null;
  onCancel?: () => void;
};

export function CropProgressModal({ progress, onCancel }: CropProgressModalProps) {
  const { colors } = useShellTheme();
  const state = useCropProgressModal(progress);
  if (!state) return null;

  return (
    <ModalScrim open onClose={() => undefined}>
      <DialogSurface>
        <Text style={[styles.title, { color: colors.foreground }]}>Cropping ROI output</Text>
        <Spinner />
        <Text style={{ color: colors.foreground }}>{state.message}</Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[styles.progressFill, { backgroundColor: colors.primary, width: `${state.pct}%` }]}
          />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
          {state.done} / {state.total}
        </Text>
        {onCancel ? <Button label="Cancel" variant="destructive" onPress={onCancel} /> : null}
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  title: {
    ...liscaType.dialogTitle,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    height: "100%",
  },
});
