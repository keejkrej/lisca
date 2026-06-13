import { Button, DialogDescriptionText, DialogSurface, DialogTitleText, DialogActions, ModalScrim } from "@lisca/ui-native";

import type { AlignState } from "../state/use-align-state";

export function CropConfirmModal({ state }: { state: AlignState }) {
  const confirm = state.cropConfirm;
  if (!confirm) return null;

  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return (
    <ModalScrim open onClose={state.cancelCropConfirm}>
      <DialogSurface>
        <DialogTitleText>ROI output already exists</DialogTitleText>
        <DialogDescriptionText>
          {confirm.kind === "single"
            ? `roi/Pos${confirm.positions[0]} already exists. Overwrite the existing cropped ROI files for this position?`
            : `${confirm.existingPositions.length} of ${confirm.positions.length} saved positions already have ROI output.`}
        </DialogDescriptionText>
        {confirm.kind === "batch" ? (
          <DialogDescriptionText className="max-h-20">{existingList}</DialogDescriptionText>
        ) : null}
        <DialogActions>
          <Button label="Cancel" variant="outline" onPress={state.cancelCropConfirm} />
          {confirm.kind === "batch" ? (
            <Button label="Skip Existing" variant="outline" onPress={state.skipExistingCrop} />
          ) : null}
          <Button label="Overwrite" onPress={state.confirmCropOverwrite} />
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}
