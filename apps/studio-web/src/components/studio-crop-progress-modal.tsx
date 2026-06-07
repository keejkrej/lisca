import { CropProgressModal } from "@lisca/ui";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioCropProgressModal({ state }: { state: StudioAlignState }) {
  return <CropProgressModal progress={state.cropProgress} onCancel={() => void state.cancelCrop()} />;
}
