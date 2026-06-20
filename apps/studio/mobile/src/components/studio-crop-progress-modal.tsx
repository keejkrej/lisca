import { CropProgressModal } from "@lisca/ui-native";

import { useStudioAlignCrop } from "../state/studio-align-page-selectors";
import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioCropProgressModal() {
  const { state } = useStudioAlignPage();
  const crop = useStudioAlignCrop();

  return (
    <CropProgressModal progress={crop.cropProgress} onCancel={() => void state.cancelCrop()} />
  );
}
