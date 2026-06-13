import {
  Button,
  DialogActions,
  DialogDescriptionText,
  DialogSurface,
  DialogTitleText,
  ModalScrim,
  Text,
} from "@lisca/ui-native";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioCropStartModal({ state }: { state: StudioAlignState }) {
  const confirm = state.cropStartConfirm;
  if (!confirm) return null;

  return (
    <ModalScrim open onClose={state.cancelCropStartConfirm}>
      <DialogSurface>
        <DialogTitleText>All positions aligned</DialogTitleText>
        <DialogDescriptionText>
          {`${confirm.positions.length} positions have saved alignment output. Start cropping ROI output now?`}
        </DialogDescriptionText>
        <DialogActions>
          <Button size="sm" variant="outline" onPress={state.cancelCropStartConfirm}>
            <Text className="text-xs">Cancel</Text>
          </Button>
          <Button size="sm" onPress={state.startConfirmedCrop}>
            <Text className="text-xs">Start</Text>
          </Button>
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}

export function StudioCropConfirmModal({ state }: { state: StudioAlignState }) {
  const confirm = state.cropConfirm;
  if (!confirm) return null;

  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return (
    <ModalScrim open onClose={state.cancelCropConfirm}>
      <DialogSurface>
        <DialogTitleText>ROI output already exists</DialogTitleText>
        <DialogDescriptionText>
          {`${confirm.existingPositions.length} of ${confirm.positions.length} saved positions already have ROI output. Overwrite those folders or skip them and crop only the remaining positions.`}
        </DialogDescriptionText>
        <DialogDescriptionText className="mt-2" numberOfLines={4}>
          {existingList}
        </DialogDescriptionText>
        <DialogActions className="mt-4">
          <Button size="sm" variant="outline" onPress={state.cancelCropConfirm}>
            <Text className="text-xs">Cancel</Text>
          </Button>
          <Button size="sm" variant="outline" onPress={state.skipExistingCrop}>
            <Text className="text-xs">Skip Existing</Text>
          </Button>
          <Button size="sm" onPress={state.confirmCropOverwrite}>
            <Text className="text-xs">Overwrite</Text>
          </Button>
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}
