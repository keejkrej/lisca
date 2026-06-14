import { ASSAY_FEATURE, ASSAY_TYPE } from "@lisca/contracts/assay";
import { cn } from "@lisca/ui-native/lib/utils";
import { Field, FieldLabel, Input, Text } from "@lisca/ui-native";
import { Image, Pressable, View } from "react-native";

import {
  type BasicInfo2FeatureId,
  type TimelapseUnit,
  useStudioStore,
} from "../state/studio-store";
import { featureImageSources } from "./basic-info-assets";
import {
  basicInfoContainerClassName,
  basicInfoFieldLabelClassName,
  basicInfoRowClassName,
} from "./basic-info-layout";
import { BasicInfoSelect } from "./basic-info-select";

const PATTERN_OPTIONS = [
  { value: "", label: "Choose pattern" },
  { value: "30 um", label: "30 um" },
  { value: "200 um", label: "200 um" },
] as const;

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
    <View className={basicInfoContainerClassName}>
      <View className={basicInfoRowClassName}>
        <Field className="gap-2.5">
          <FieldLabel className={basicInfoFieldLabelClassName}>Pattern</FieldLabel>
          <BasicInfoSelect
            options={[...PATTERN_OPTIONS]}
            value={info2.pattern}
            onChange={(pattern) => setInfo2({ pattern })}
          />
        </Field>
      </View>
      <View className={basicInfoRowClassName}>
        <Field className="gap-2.5">
          <FieldLabel className={basicInfoFieldLabelClassName}>Timelapse interval</FieldLabel>
          <View className="w-full flex-row flex-wrap items-stretch gap-2.5">
            <Input
              className="min-w-0 flex-1"
              keyboardType="numeric"
              placeholder="10"
              value={info2.timelapseAmount == null ? "" : String(info2.timelapseAmount)}
              onChangeText={(text) => {
                const value = text.trim() === "" ? null : Number(text);
                setInfo2({
                  timelapseAmount:
                    value == null || Number.isNaN(value) ? null : Math.max(1, value),
                });
              }}
            />
            <View className="w-[10.5rem] shrink-0">
              <BasicInfoSelect
                options={TIMELAPSE_UNITS}
                value={info2.timelapseUnit}
                onChange={(timelapseUnit) => setInfo2({ timelapseUnit })}
              />
            </View>
          </View>
        </Field>
      </View>
      {showFeaturePicker && FEATURES.length > 0 ? (
        <View className="min-h-[200px] w-full p-2.5">
          <Field className="min-h-[200px] gap-2.5">
            <FieldLabel className={basicInfoFieldLabelClassName}>Features</FieldLabel>
            <View className="w-full flex-row flex-wrap gap-2.5 p-2.5">
              {FEATURES.map(({ id, title }) => {
                const selected = isSelected(id);
                const disabled = isFeatureDisabled(id);
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled }}
                    className={cn(
                      "min-h-[120px] min-w-0 flex-1 basis-[22%] items-center justify-center rounded-lg border-2 p-2.5",
                      selected
                        ? "border-foreground/80 opacity-100 ring-1 ring-foreground/20"
                        : "border-border opacity-60",
                      disabled && "opacity-40",
                    )}
                    disabled={disabled}
                    onPress={() => toggleFeature(id)}
                  >
                    <Text className="sr-only">{title}</Text>
                    <Image
                      accessibilityIgnoresInvertColors
                      className="h-[120px] w-full"
                      resizeMode="contain"
                      source={featureImageSources[id]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </Field>
        </View>
      ) : null}
    </View>
  );
}
