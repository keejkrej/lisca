import { CropProgressModal } from "@lisca/ui/features";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioCropProgressModal() {
  const { state } = useStudioAlignPage();
  return (
    <CropProgressModal progress={state.cropProgress} onCancel={() => void state.cancelCrop()} />
  );
}