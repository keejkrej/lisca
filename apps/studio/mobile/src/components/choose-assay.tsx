import { ASSAY_TYPE, ENABLED_STUDIO_ASSAY_IDS } from "@lisca/contracts/assay";
import { Button, Text } from "@lisca/ui-native";
import { View } from "react-native";

import { ASSAY_CHOICE_LABEL, type AssayId, useStudioStore } from "../state/studio-store";

const ASSAY_ORDER: AssayId[] = [
  ASSAY_TYPE.GENE_EXPRESSION,
  ASSAY_TYPE.IMMUNE_KILLING,
  ASSAY_TYPE.LNP_BINDING,
  ASSAY_TYPE.CUSTOM_ASSAY,
];
const ENABLED_ASSAY_IDS = new Set<AssayId>(ENABLED_STUDIO_ASSAY_IDS);

export function ChooseAssay() {
  const assayId = useStudioStore((state) => state.assayId);
  const setAssayId = useStudioStore((state) => state.setAssayId);

  return (
    <View className="w-full flex-1 items-center justify-center px-6">
      <Text className="text-center text-4xl font-semibold">LiSCA</Text>
      <View accessibilityRole="radiogroup" className="mt-8 w-full max-w-md flex-row flex-wrap justify-center gap-3">
        {ASSAY_ORDER.map((id) => {
          const selected = assayId === id;
          const disabled = !ENABLED_ASSAY_IDS.has(id);
          return (
            <View key={id} className="min-w-[140px] flex-grow basis-[45%]">
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
