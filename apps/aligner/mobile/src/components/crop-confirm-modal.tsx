import { cropConfirmCopy } from "@lisca/ui-native/features";
import { Text } from "@lisca/ui-native";
import {
  Button,
  DialogActions,
  DialogDescriptionText,
  DialogSurface,
  DialogTitleText,
  ModalScrim,
} from "@lisca/ui-native/shell";

import { useAlignCrop } from "../state/align-page-selectors";

export function CropConfirmModal() {
  const crop = useAlignCrop();
  const confirm = crop.cropConfirm;
  if (!confirm) return null;

  const copy = cropConfirmCopy({
    existingCount: confirm.existingPositions.length,
    totalCount: confirm.positions.length,
    singlePosition: confirm.kind === "single" ? confirm.positions[0] : undefined,
  });
  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return (
    <ModalScrim open onClose={crop.cancelCropConfirm}>
      <DialogSurface maxWidth={448}>
        <DialogTitleText>{copy.title}</DialogTitleText>
        <DialogDescriptionText>{copy.description}</DialogDescriptionText>
        {copy.showSkipExisting ? (
          <DialogDescriptionText className="max-h-20 text-xs text-muted-foreground">
            {existingList}
          </DialogDescriptionText>
        ) : null}
        <DialogActions>
          <Button size="sm" variant="outline" onPress={crop.cancelCropConfirm}>
            <Text className="text-xs">Cancel</Text>
          </Button>
          {copy.showSkipExisting ? (
            <Button size="sm" variant="outline" onPress={crop.skipExistingCrop}>
              <Text className="text-xs">Skip Existing</Text>
            </Button>
          ) : null}
          <Button size="sm" onPress={crop.confirmCropOverwrite}>
            <Text className="text-xs">Overwrite</Text>
          </Button>
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}
