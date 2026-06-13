import type { CropRoiProgress } from "@lisca/contracts";
import { useCropProgressModal } from "@lisca/ui-headless/crop-progress-modal";
import { View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";
import { ShellProgress } from "../../shell/chrome/progress-bar";
import { DialogTitleText } from "../../shell/modal/dialog-copy";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";
import { Spinner } from "../../shell/regions/panel";

const DIALOG_MAX_WIDTH = 448;

export type CropProgressModalProps = {
  progress: CropRoiProgress | null;
  onCancel?: () => void;
};

export function CropProgressModal({ progress, onCancel }: CropProgressModalProps) {
  const state = useCropProgressModal(progress);
  if (!state) return null;

  return (
    <ModalScrim open onClose={() => undefined}>
      <DialogSurface accessibilityLabel="Cropping ROI output" maxWidth={DIALOG_MAX_WIDTH}>
        <View className="flex-row items-center gap-3">
          <Spinner size="small" />
          <View className="min-w-0 flex-1">
            <DialogTitleText className="text-base" tone="sans">
              Cropping ROI output
            </DialogTitleText>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {state.message}
            </Text>
          </View>
        </View>
        <View className="mt-4">
          <ShellProgress value={state.pct} />
        </View>
        <Text className="mt-2 text-xs tabular-nums text-muted-foreground">
          {state.done} / {state.total}
        </Text>
        {onCancel ? (
          <Button className="mt-4 w-full" size="sm" variant="outline" onPress={onCancel}>
            <Text>Cancel</Text>
          </Button>
        ) : null}
      </DialogSurface>
    </ModalScrim>
  );
}
