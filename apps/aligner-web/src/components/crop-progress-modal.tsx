import { CropProgressModal as SharedCropProgressModal } from "@lisca/ui";

import type { AlignState } from "../state/use-align-state";

export function CropProgressModal({ state }: { state: AlignState }) {
  return <SharedCropProgressModal progress={state.cropProgress} onCancel={() => void state.cancelCrop()} />;
}
