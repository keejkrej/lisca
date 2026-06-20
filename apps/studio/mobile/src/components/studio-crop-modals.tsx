import { cropConfirmCopy } from "@lisca/ui-native/features";
import {
  Button,
  DialogActions,
  DialogDescriptionText,
  DialogSurface,
  DialogTitleText,
  ModalScrim,
  Text,
} from "@lisca/ui-native";
import { View } from "react-native";

import { useStudioAlignCrop } from "../state/studio-align-page-selectors";
import type { StudioAlignState } from "../state/use-studio-align-state";

const DIALOG_MAX_WIDTH = 448;

export function StudioCropStartModal({ state }: { state: StudioAlignState }) {
  const confirm = state.cropStartConfirm;
  if (!confirm) return null;

  return (
    <ModalScrim open onClose={state.cancelCropStartConfirm}>
      <DialogSurface maxWidth={DIALOG_MAX_WIDTH}>
        <View className="gap-4">
          <View className="gap-1">
            <DialogTitleText className="text-base" tone="sans">
              All positions aligned
            </DialogTitleText>
            <DialogDescriptionText>
              {`${confirm.positions.length} positions have saved alignment output. Start cropping ROI output now?`}
            </DialogDescriptionText>
          </View>
          <DialogActions>
            <Button size="sm" variant="outline" onPress={state.cancelCropStartConfirm}>
              <Text>Cancel</Text>
            </Button>
            <Button size="sm" onPress={state.startConfirmedCrop}>
              <Text>Start</Text>
            </Button>
          </DialogActions>
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}

export function StudioCropConfirmModal() {
  const crop = useStudioAlignCrop();
  const confirm = crop.cropConfirm;
  if (!confirm) return null;

  const copy = cropConfirmCopy({
    existingCount: confirm.existingPositions.length,
    totalCount: confirm.positions.length,
  });
  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return (
    <ModalScrim open onClose={crop.cancelCropConfirm}>
      <DialogSurface maxWidth={DIALOG_MAX_WIDTH}>
        <View className="gap-4">
          <View className="gap-1">
            <DialogTitleText className="text-base" tone="sans">
              {copy.title}
            </DialogTitleText>
            <DialogDescriptionText>{copy.description}</DialogDescriptionText>
            <DialogDescriptionText className="max-h-20 text-xs">
              {existingList}
            </DialogDescriptionText>
          </View>
          <DialogActions>
            <Button size="sm" variant="outline" onPress={crop.cancelCropConfirm}>
              <Text>Cancel</Text>
            </Button>
            <Button size="sm" variant="outline" onPress={crop.skipExistingCrop}>
              <Text>Skip Existing</Text>
            </Button>
            <Button size="sm" onPress={crop.confirmCropOverwrite}>
              <Text>Overwrite</Text>
            </Button>
          </DialogActions>
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}
