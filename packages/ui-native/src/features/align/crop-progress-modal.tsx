import type { CropRoiProgress } from "@lisca/contracts";
import { useCropProgressModal } from "@lisca/ui-headless/crop-progress-modal";
import { View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";
import { ShellProgress } from "../../shell/chrome/progress-bar";
import { DialogTitleText } from "../../shell/modal/dialog-copy";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";
import { Spinner } from "../../shell/regions/panel";

export type CropProgressModalProps = {
  progress: CropRoiProgress | null;
  onCancel?: () => void;
};

export function CropProgressModal({ progress, onCancel }: CropProgressModalProps) {
  const state = useCropProgressModal(progress);
  if (!state) return null;

  return (
    <ModalScrim open onClose={() => undefined}>
      <DialogSurface accessibilityLabel="Cropping ROI output">
        <View className="flex-row items-center gap-3">
          <Spinner size="small" />
          <View className="min-w-0 flex-1">
            <DialogTitleText tone="sans">Cropping ROI output</DialogTitleText>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {state.message}
            </Text>
          </View>
        </View>
        <ShellProgress value={state.pct} />
        <Text className="text-xs tabular-nums text-muted-foreground">
          {state.done} / {state.total}
        </Text>
        {onCancel ? (
          <Button size="sm" variant="outline" onPress={onCancel}>
            <Text>Cancel</Text>
          </Button>
        ) : null}
      </DialogSurface>
    </ModalScrim>
  );
}
