import { ASSAY_FEATURE, ASSAY_TYPE } from "@lisca/contracts/assay";
import { Button, Input, Section } from "@lisca/ui-native";
import { View } from "react-native";

import {
  type BasicInfo2FeatureId,
  type TimelapseUnit,
  useStudioStore,
} from "../state/studio-store";

const PATTERN_OPTIONS = ["30 um", "200 um"] as const;
const FEATURES: { id: BasicInfo2FeatureId; title: string }[] = [
  { id: ASSAY_FEATURE.MORPHOLOGY, title: "Morphology" },
  { id: ASSAY_FEATURE.PART_COUNT, title: "Part count" },
  { id: ASSAY_FEATURE.PART_FLUOR, title: "Part fluor" },
  { id: ASSAY_FEATURE.TOTAL_FLUOR, title: "Total fluor" },
];
const TIMELAPSE_UNITS: { value: TimelapseUnit; label: string }[] = [
  { value: "second", label: "Second" },
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
];

export function BasicInfoStep2() {
  const assayId = useStudioStore((state) => state.assayId);
  const info2 = useStudioStore((state) => state.info2);
  const setInfo2 = useStudioStore((state) => state.setInfo2);
  const isGeneExpression = assayId === ASSAY_TYPE.GENE_EXPRESSION;
  const showFeaturePicker = isGeneExpression;
  const selectedFeatures = Array.isArray(info2.selectedFeatures) ? info2.selectedFeatures : [];

  const isSelected = (id: BasicInfo2FeatureId) => selectedFeatures.includes(id);
  const isFeatureDisabled = (id: BasicInfo2FeatureId) =>
    isGeneExpression && id !== ASSAY_FEATURE.TOTAL_FLUOR;

  const toggleFeature = (id: BasicInfo2FeatureId) => {
    if (isGeneExpression) {
      setInfo2({ selectedFeatures: [ASSAY_FEATURE.TOTAL_FLUOR] });
      return;
    }
    setInfo2({
      selectedFeatures: selectedFeatures.includes(id)
        ? selectedFeatures.filter((item) => item !== id)
        : [...selectedFeatures, id],
    });
  };

  return (
    <View className="w-full gap-2">
      <Section contentClassName="gap-2" title="Pattern">
        <View className="flex-row flex-wrap gap-2">
          {PATTERN_OPTIONS.map((pattern) => (
            <View key={pattern} className="min-w-[120px] flex-1">
              <Button
                label={pattern}
                variant={info2.pattern === pattern ? "default" : "outline"}
                onPress={() => setInfo2({ pattern })}
              />
            </View>
          ))}
        </View>
      </Section>
      <Section contentClassName="gap-2" title="Timelapse interval">
        <View className="flex-row flex-wrap gap-2">
          <Input
            className="min-w-[120px] flex-1"
            keyboardType="numeric"
            placeholder="10"
            value={info2.timelapseAmount == null ? "" : String(info2.timelapseAmount)}
            onChangeText={(text) => {
              const value = text.trim() === "" ? null : Number(text);
              setInfo2({ timelapseAmount: value == null || Number.isNaN(value) ? null : value });
            }}
          />
          <View className="flex-row flex-wrap gap-1">
            {TIMELAPSE_UNITS.map(({ value, label }) => (
              <View key={value} className="min-w-[72px]">
                <Button
                  compact
                  label={label}
                  variant={info2.timelapseUnit === value ? "default" : "outline"}
                  onPress={() => setInfo2({ timelapseUnit: value })}
                />
              </View>
            ))}
          </View>
        </View>
      </Section>
      {showFeaturePicker && FEATURES.length > 0 ? (
        <Section contentClassName="flex-row flex-wrap gap-2" title="Features">
          {FEATURES.map(({ id, title }) => {
            const selected = isSelected(id);
            const disabled = isFeatureDisabled(id);
            return (
              <View key={id} className="min-w-[120px] flex-grow basis-[47%]">
                <Button
                  disabled={disabled}
                  label={title}
                  variant={selected ? "default" : "outline"}
                  onPress={() => toggleFeature(id)}
                />
              </View>
            );
          })}
        </Section>
      ) : null}
    </View>
  );
}
