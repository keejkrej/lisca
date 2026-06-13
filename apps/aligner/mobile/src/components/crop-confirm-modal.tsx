import { cropConfirmCopy } from "@lisca/ui-native";
import {
  Button,
  DialogActions,
  DialogDescriptionText,
  DialogSurface,
  DialogTitleText,
  ModalScrim,
  Text,
} from "@lisca/ui-native";

import type { AlignState } from "../state/use-align-state";

export function CropConfirmModal({ state }: { state: AlignState }) {
  const confirm = state.cropConfirm;
  if (!confirm) return null;

  const copy = cropConfirmCopy({
    existingCount: confirm.existingPositions.length,
    totalCount: confirm.positions.length,
    singlePosition: confirm.kind === "single" ? confirm.positions[0] : undefined,
  });
  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return (
    <ModalScrim open onClose={state.cancelCropConfirm}>
      <DialogSurface>
        <DialogTitleText>{copy.title}</DialogTitleText>
        <DialogDescriptionText>{copy.description}</DialogDescriptionText>
        {copy.showSkipExisting ? (
          <DialogDescriptionText className="max-h-20">{existingList}</DialogDescriptionText>
        ) : null}
        <DialogActions>
          <Button variant="outline" onPress={state.cancelCropConfirm}>
            <Text>Cancel</Text>
          </Button>
          {copy.showSkipExisting ? (
            <Button variant="outline" onPress={state.skipExistingCrop}>
              <Text>Skip Existing</Text>
            </Button>
          ) : null}
          <Button onPress={state.confirmCropOverwrite}>
            <Text>Overwrite</Text>
          </Button>
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}
