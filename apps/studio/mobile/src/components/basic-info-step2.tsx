import { ASSAY_FEATURE, ASSAY_TYPE } from "@lisca/contracts";
import { Button, Section, useShellTheme } from "@lisca/ui-native";
import { StyleSheet, TextInput, View } from "react-native";

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
  const { colors } = useShellTheme();
  const assayId = useStudioStore((state) => state.assayId);
  const info2 = useStudioStore((state) => state.info2);
  const setInfo2 = useStudioStore((state) => state.setInfo2);
  const isGeneExpression = assayId === ASSAY_TYPE.GENE_EXPRESSION;
  const showFeaturePicker = isGeneExpression;
  const selectedFeatures = Array.isArray(info2.selectedFeatures) ? info2.selectedFeatures : [];
  const inputStyle = [
    styles.input,
    { borderColor: colors.input, color: colors.foreground, backgroundColor: colors.controlSurface },
  ];

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
    <View style={styles.root}>
      <Section contentStyle={styles.sectionContent} title="Pattern">
        <View style={styles.row}>
          {PATTERN_OPTIONS.map((pattern) => (
            <View key={pattern} style={styles.flexCell}>
              <Button
                label={pattern}
                variant={info2.pattern === pattern ? "default" : "outline"}
                onPress={() => setInfo2({ pattern })}
              />
            </View>
          ))}
        </View>
      </Section>
      <Section contentStyle={styles.sectionContent} title="Timelapse interval">
        <View style={styles.row}>
          <TextInput
            keyboardType="numeric"
            placeholder="10"
            style={[inputStyle, styles.flexCell]}
            value={info2.timelapseAmount == null ? "" : String(info2.timelapseAmount)}
            onChangeText={(text) => {
              const value = text.trim() === "" ? null : Number(text);
              setInfo2({ timelapseAmount: value == null || Number.isNaN(value) ? null : value });
            }}
          />
          <View style={styles.unitRow}>
            {TIMELAPSE_UNITS.map(({ value, label }) => (
              <View key={value} style={styles.unitCell}>
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
        <Section contentStyle={styles.featuresGrid} title="Features">
          {FEATURES.map(({ id, title }) => {
            const selected = isSelected(id);
            const disabled = isFeatureDisabled(id);
            return (
              <View key={id} style={styles.featureCell}>
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

const styles = StyleSheet.create({
  root: {
    gap: 8,
    width: "100%",
  },
  sectionContent: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  flexCell: {
    flex: 1,
    minWidth: 120,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  unitRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  unitCell: {
    minWidth: 72,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featureCell: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 120,
  },
});
