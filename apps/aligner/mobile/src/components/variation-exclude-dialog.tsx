import {
  deriveVariationExcludePreview,
  formatVariationScore,
  nextVariationExcludeThreshold,
} from "@lisca/ui-headless/variation-exclude-preview";
import {
  Button,
  DialogBody,
  DialogDescriptionText,
  DialogFooter,
  DialogHeader,
  DialogSurface,
  DialogTitleText,
  Field,
  Input,
  ModalScrim,
  Slider,
  StatTile,
  Text,
  VariationScoreHistogram,
} from "@lisca/ui-native";
import { View } from "react-native";
import type { VariationExcludePreview } from "../state/use-align-state";

type VariationExcludeDialogProps = {
  state: VariationExcludePreview | null;
  onApply: () => void;
  onCancel: () => void;
  onThresholdChange: (threshold: number) => void;
};

export function VariationExcludeDialog({
  state,
  onApply,
  onCancel,
  onThresholdChange,
}: VariationExcludeDialogProps) {
  const derived = deriveVariationExcludePreview(state);
  if (!derived) return null;
  const { preview, threshold, selectedCount, metrics } = derived;
  const setThreshold = (value: number) => {
    const next = nextVariationExcludeThreshold(state, value);
    if (next != null) onThresholdChange(next);
  };

  return (
    <ModalScrim open={true} onClose={onCancel}>
      <DialogSurface maxWidth={640} padded={false}>
        <DialogHeader>
          <DialogTitleText>Var exclude</DialogTitleText>
        </DialogHeader>

        <DialogBody>
          <View className="flex-row gap-2">
            <StatTile label="Eligible cells" value={preview.eligibleCellCount} />
            <StatTile label="Selected cells" value={selectedCount} />
            <StatTile
              label="Score range"
              value={`${formatVariationScore(preview.scoreMin)} - ${formatVariationScore(preview.scoreMax)}`}
            />
          </View>

          <VariationScoreHistogram bins={preview.histogramBins} threshold={threshold} />

          <View className="flex-row items-end gap-3">
            <View className="min-w-0 flex-1 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-foreground">Threshold</Text>
                <DialogDescriptionText className="mb-0">
                  {formatVariationScore(threshold)}
                </DialogDescriptionText>
              </View>
              <Slider
                maximumValue={metrics.max}
                minimumValue={metrics.min}
                step={metrics.step}
                style={{ width: "100%", height: 32 }}
                value={threshold}
                onSlidingComplete={setThreshold}
                onValueChange={setThreshold}
              />
            </View>
            <Input
              className="w-24"
              keyboardType="decimal-pad"
              value={String(threshold)}
              onChangeText={(text) => setThreshold(Number(text))}
            />
          </View>
        </DialogBody>

        <DialogFooter>
          <Button label="Cancel" variant="outline" onPress={onCancel} />
          <Button label="Apply" onPress={onApply} />
        </DialogFooter>
      </DialogSurface>
    </ModalScrim>
  );
}
