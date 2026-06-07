import { CropProgressModal as SharedCropProgressModal } from "@lisca/ui/features";

import { useAlignCrop } from "../state/align-page-selectors";

export function CropProgressModal() {
  const crop = useAlignCrop();
  return (
    <SharedCropProgressModal progress={crop.cropProgress} onCancel={() => void crop.cancelCrop()} />
  );
}
