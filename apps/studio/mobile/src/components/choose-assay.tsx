import { ASSAY_TYPE, ENABLED_STUDIO_ASSAY_IDS } from "@lisca/contracts";
import { Button, useShellTheme } from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import { ASSAY_CHOICE_LABEL, type AssayId, useStudioStore } from "../state/studio-store";

const ASSAY_ORDER: AssayId[] = [
  ASSAY_TYPE.GENE_EXPRESSION,
  ASSAY_TYPE.IMMUNE_KILLING,
  ASSAY_TYPE.LNP_BINDING,
  ASSAY_TYPE.CUSTOM_ASSAY,
];
const ENABLED_ASSAY_IDS = new Set<AssayId>(ENABLED_STUDIO_ASSAY_IDS);

export function ChooseAssay() {
  const { colors } = useShellTheme();
  const assayId = useStudioStore((state) => state.assayId);
  const setAssayId = useStudioStore((state) => state.setAssayId);

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: colors.foreground }]}>LiSCA</Text>
      <View accessibilityRole="radiogroup" style={styles.grid}>
        {ASSAY_ORDER.map((id) => {
          const selected = assayId === id;
          const disabled = !ENABLED_ASSAY_IDS.has(id);
          return (
            <View key={id} style={styles.cell}>
              <Button
                disabled={disabled}
                label={ASSAY_CHOICE_LABEL[id]}
                variant={selected ? "default" : "outline"}
                onPress={() => setAssayId(id)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  title: {
    fontSize: 36,
    fontWeight: "600",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginTop: 32,
    maxWidth: 448,
    width: "100%",
  },
  cell: {
    flexBasis: "45%",
    flexGrow: 1,
    minWidth: 140,
  },
});
