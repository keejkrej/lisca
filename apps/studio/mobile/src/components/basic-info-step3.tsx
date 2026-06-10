import { Button, Section, useShellTheme } from "@lisca/ui-native";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { type BasicInfoSlideId, useStudioStore } from "../state/studio-store";

const SLIDE_OPTIONS: { id: BasicInfoSlideId; label: string }[] = [
  { id: "slide-i", label: "Slide I" },
  { id: "slide-vi", label: "Slide VI" },
];

export function BasicInfoStep3() {
  const { colors } = useShellTheme();
  const info3 = useStudioStore((state) => state.info3);
  const setInfo3 = useStudioStore((state) => state.setInfo3);
  const updateInfo3Sample = useStudioStore((state) => state.updateInfo3Sample);
  const activeSamples = info3.samplesBySlide[info3.selectedSlideId];
  const inputStyle = [
    styles.input,
    { borderColor: colors.input, color: colors.foreground, backgroundColor: colors.controlSurface },
  ];

  return (
    <View style={styles.root}>
      <Section contentStyle={styles.sectionContent} title="Slide">
        <View style={styles.slideRow}>
          {SLIDE_OPTIONS.map(({ id, label }) => (
            <View key={id} style={styles.slideCell}>
              <Button
                label={label}
                variant={info3.selectedSlideId === id ? "default" : "outline"}
                onPress={() => setInfo3({ selectedSlideId: id })}
              />
            </View>
          ))}
        </View>
      </Section>
      <Section contentStyle={styles.sectionContent} title="Samples">
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          Position start and finish use 1-based indexing (Pos1, Pos2, …).
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.table}>
            <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
              {["Channel", "Name", "Start", "Finish", "Mask", "Signal"].map((heading) => (
                <Text key={heading} style={[styles.headerCell, { color: colors.mutedForeground }]}>
                  {heading}
                </Text>
              ))}
            </View>
            {activeSamples.map((row, index) => (
              // Rows are updated by index in store; stable row ids are not available.
              // oxlint-disable-next-line react(no-array-index-key)
              <View key={index} style={styles.dataRow}>
                <TextInput
                  keyboardType="numeric"
                  style={[inputStyle, styles.cellInput]}
                  value={row.channel}
                  onChangeText={(channel) => updateInfo3Sample(index, { channel })}
                />
                <TextInput
                  style={[inputStyle, styles.cellInputWide]}
                  value={row.name}
                  onChangeText={(name) => updateInfo3Sample(index, { name })}
                />
                <TextInput
                  keyboardType="numeric"
                  style={[inputStyle, styles.cellInput]}
                  value={row.positionStart}
                  onChangeText={(positionStart) => updateInfo3Sample(index, { positionStart })}
                />
                <TextInput
                  keyboardType="numeric"
                  style={[inputStyle, styles.cellInput]}
                  value={row.positionFinish}
                  onChangeText={(positionFinish) => updateInfo3Sample(index, { positionFinish })}
                />
                <TextInput
                  keyboardType="numeric"
                  style={[inputStyle, styles.cellInput]}
                  value={row.maskChannel}
                  onChangeText={(maskChannel) => updateInfo3Sample(index, { maskChannel })}
                />
                <TextInput
                  keyboardType="numeric"
                  style={[inputStyle, styles.cellInput]}
                  value={row.signalChannel}
                  onChangeText={(signalChannel) => updateInfo3Sample(index, { signalChannel })}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </Section>
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
  slideRow: {
    flexDirection: "row",
    gap: 8,
  },
  slideCell: {
    flex: 1,
  },
  table: {
    gap: 8,
    minWidth: 720,
  },
  headerRow: {
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingBottom: 6,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: "500",
    width: 96,
  },
  dataRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cellInput: {
    width: 96,
  },
  cellInputWide: {
    width: 120,
  },
});
