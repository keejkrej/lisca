import { cropConfirmCopy } from "@lisca/ui-native";
import {
  Button,
  DialogDescriptionText,
  DialogSurface,
  DialogTitleText,
  DialogActions,
  ModalScrim,
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
          <Button label="Cancel" variant="outline" onPress={state.cancelCropConfirm} />
          {copy.showSkipExisting ? (
            <Button label="Skip Existing" variant="outline" onPress={state.skipExistingCrop} />
          ) : null}
          <Button label="Overwrite" onPress={state.confirmCropOverwrite} />
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}
