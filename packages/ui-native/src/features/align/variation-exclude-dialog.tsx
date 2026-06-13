import type { AutoExcludePreviewResponse } from "@lisca/contracts";
import {
  deriveVariationExcludePreview,
  formatVariationScore,
  nextVariationExcludeThreshold,
} from "@lisca/ui-headless/variation-exclude-preview";
import { View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Slider } from "../../../components/ui/slider";
import { Text } from "../../../components/ui/text";
import {
  DialogBody,
  DialogDescriptionText,
  DialogFooter,
  DialogHeader,
  DialogSurface,
  DialogTitleText,
  ModalScrim,
  StatTile,
} from "../../shell";
import { VariationScoreHistogram } from "../studio/variation-score-histogram";

export type VariationExcludePreviewState = {
  preview: AutoExcludePreviewResponse;
  threshold: number;
} | null;

export function VariationExcludeDialog(props: {
  state: VariationExcludePreviewState;
  onApply: () => void;
  onCancel: () => void;
  onThresholdChange: (threshold: number) => void;
}) {
  const derived = deriveVariationExcludePreview(
    props.state ? { preview: props.state.preview, threshold: props.state.threshold } : null,
  );
  if (!derived) return null;
  const { preview, threshold, selectedCount, metrics } = derived;
  const setThreshold = (value: number) => {
    const next = nextVariationExcludeThreshold(
      props.state ? { preview: props.state.preview, threshold: props.state.threshold } : null,
      value,
    );
    if (next != null) props.onThresholdChange(next);
  };

  return (
    <ModalScrim open={true} onClose={props.onCancel}>
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
          <Button variant="outline" onPress={props.onCancel}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={props.onApply}>
            <Text>Apply</Text>
          </Button>
        </DialogFooter>
      </DialogSurface>
    </ModalScrim>
  );
}
