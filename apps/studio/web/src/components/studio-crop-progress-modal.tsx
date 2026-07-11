import { CropProgressModal } from "@lisca/ui/features";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioCropProgressModal() {
  const { state } = useStudioAlignPage();
  return (
    <CropProgressModal
      progress={state.cropProgress}
      onCancel={() => {
        if (globalThis.confirm("Cancel the active crop job?")) void state.cancelCrop();
      }}
    />
  );
}
