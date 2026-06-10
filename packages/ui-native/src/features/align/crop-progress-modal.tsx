import type { CropRoiProgress } from "@lisca/contracts";
import { isDoneCropStatus } from "@lisca/utils";
import { StyleSheet, Text } from "react-native";

import { Button } from "../../shell/chrome/buttons.tsx";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal.tsx";
import { Spinner } from "../../shell/regions/panel.tsx";
import { useShellTheme } from "../../theme/shell-theme.tsx";

export type CropProgressModalProps = {
  progress: CropRoiProgress | null;
  onCancel?: () => void;
};

export function CropProgressModal({ progress, onCancel }: CropProgressModalProps) {
  const { colors } = useShellTheme();
  if (!progress || isDoneCropStatus(progress.status)) return null;

  return (
    <ModalScrim open onClose={() => undefined}>
      <DialogSurface>
        <Text style={[styles.title, { color: colors.foreground }]}>Cropping ROI</Text>
        <Spinner />
        <Text style={{ color: colors.foreground }}>
          {progress.message ?? progress.status} ({progress.completedPositions}/
          {progress.totalPositions})
        </Text>
        {onCancel ? <Button label="Cancel" variant="destructive" onPress={onCancel} /> : null}
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
});
