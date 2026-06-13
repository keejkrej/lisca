import type { CropRoiProgress } from "@lisca/contracts";
import { useCropProgressModal } from "@lisca/ui-headless/crop-progress-modal";

import { Button } from "../../shell/chrome/buttons";
import { ShellProgress } from "../../shell/chrome/progress-bar";
import {
  DialogDescriptionText,
  DialogTitleText,
} from "../../shell/modal/dialog-copy";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";
import { Spinner } from "../../shell/regions/panel";
import { Text } from "../../../components/ui/text";

export type CropProgressModalProps = {
  progress: CropRoiProgress | null;
  onCancel?: () => void;
};

export function CropProgressModal({ progress, onCancel }: CropProgressModalProps) {
  const state = useCropProgressModal(progress);
  if (!state) return null;

  return (
    <ModalScrim open onClose={() => undefined}>
      <DialogSurface>
        <DialogTitleText>Cropping ROI output</DialogTitleText>
        <Spinner />
        <Text className="text-sm text-foreground">{state.message}</Text>
        <ShellProgress value={state.pct} />
        <DialogDescriptionText>
          {state.done} / {state.total}
        </DialogDescriptionText>
        {onCancel ? <Button label="Cancel" variant="destructive" onPress={onCancel} /> : null}
      </DialogSurface>
    </ModalScrim>
  );
}
