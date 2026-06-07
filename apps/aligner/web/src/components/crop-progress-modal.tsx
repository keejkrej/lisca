import { CropProgressModal as SharedCropProgressModal } from "@lisca/ui";

import { useAlignPage } from "../state/align-page-context";

export function CropProgressModal() {
  const { state } = useAlignPage();
  return <SharedCropProgressModal progress={state.cropProgress} onCancel={() => void state.cancelCrop()} />;
}
