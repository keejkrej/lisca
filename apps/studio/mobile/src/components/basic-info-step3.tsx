import { cn } from "@lisca/ui-native/lib/utils";
import { Field, FieldLabel, Input, Text } from "@lisca/ui-native";
import { Image, Pressable, ScrollView, View } from "react-native";

import { type BasicInfoSlideId, useStudioStore } from "../state/studio-store";
import { slideImageSources } from "./basic-info-assets";
import {
  basicInfoFieldLabelClassName,
  basicInfoRowClassName,
} from "./basic-info-layout";

const SLIDE_OPTIONS: { id: BasicInfoSlideId; label: string }[] = [
  { id: "slide-i", label: "Slide I" },
  { id: "slide-vi", label: "Slide VI" },
];

export function BasicInfoStep3() {
  const info3 = useStudioStore((state) => state.info3);
  const setInfo3 = useStudioStore((state) => state.setInfo3);
  const updateInfo3Sample = useStudioStore((state) => state.updateInfo3Sample);
  const activeSamples = info3.samplesBySlide[info3.selectedSlideId];

  return (
    <View className="w-full min-w-0 flex-col gap-[30px]">
      <View className={basicInfoRowClassName}>
        <Field className="gap-2.5">
          <FieldLabel className={basicInfoFieldLabelClassName}>Slide</FieldLabel>
          <View className="w-full flex-row flex-wrap gap-2.5">
            {SLIDE_OPTIONS.map(({ id, label }) => {
              const selected = info3.selectedSlideId === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={cn(
                    "min-h-[160px] min-w-0 flex-1 flex-col justify-between gap-2 rounded-lg border-2 bg-background p-2.5",
                    selected ? "border-foreground/80 opacity-100 ring-1 ring-foreground/20" : "border-border opacity-70",
                  )}
                  onPress={() => setInfo3({ selectedSlideId: id })}
                >
                  <View className="min-h-[112px] w-full items-center justify-center rounded-md bg-muted/20 p-2">
                    <Image
                      accessibilityIgnoresInvertColors
                      className="max-h-[108px] w-full flex-1"
                      resizeMode="contain"
                      source={slideImageSources[id]}
                    />
                  </View>
                  <Text className="text-center text-base font-medium text-foreground">{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      </View>
      <View className={cn(basicInfoRowClassName, "min-h-0")}>
        <Field className="min-h-0 gap-2.5">
          <FieldLabel className={basicInfoFieldLabelClassName}>Samples</FieldLabel>
          <Text className="text-sm text-muted-foreground">
            Position start and finish use 1-based indexing (Pos1, Pos2, …).
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[44rem] gap-2">
              <View className="flex-row gap-2 border-b border-border pb-2">
                {["Channel", "Name", "Start", "Finish", "Mask channel", "Signal channel"].map(
                  (heading) => (
                    <Text
                      key={heading}
                      className="min-w-[7rem] flex-1 text-sm font-medium text-muted-foreground"
                    >
                      {heading}
                    </Text>
                  ),
                )}
              </View>
              {activeSamples.map((row, index) => (
                <View key={row.id} className="flex-row gap-2 py-1.5">
                  <Input
                    accessibilityLabel={`Channel row ${index + 1}`}
                    className="min-w-[7rem] flex-1"
                    keyboardType="numeric"
                    value={row.channel}
                    onChangeText={(channel) => updateInfo3Sample(index, { channel })}
                  />
                  <Input
                    accessibilityLabel={`Name row ${index + 1}`}
                    className="min-w-[7rem] flex-1"
                    value={row.name}
                    onChangeText={(name) => updateInfo3Sample(index, { name })}
                  />
                  <Input
                    accessibilityLabel={`Position start row ${index + 1}`}
                    className="min-w-[7rem] flex-1"
                    keyboardType="numeric"
                    value={row.positionStart}
                    onChangeText={(positionStart) => updateInfo3Sample(index, { positionStart })}
                  />
                  <Input
                    accessibilityLabel={`Position finish row ${index + 1}`}
                    className="min-w-[7rem] flex-1"
                    keyboardType="numeric"
                    value={row.positionFinish}
                    onChangeText={(positionFinish) => updateInfo3Sample(index, { positionFinish })}
                  />
                  <Input
                    accessibilityLabel={`Mask channel row ${index + 1}`}
                    className="min-w-[7rem] flex-1"
                    keyboardType="numeric"
                    value={row.maskChannel}
                    onChangeText={(maskChannel) => updateInfo3Sample(index, { maskChannel })}
                  />
                  <Input
                    accessibilityLabel={`Signal channel row ${index + 1}`}
                    className="min-w-[7rem] flex-1"
                    keyboardType="numeric"
                    value={row.signalChannel}
                    onChangeText={(signalChannel) => updateInfo3Sample(index, { signalChannel })}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </Field>
      </View>
    </View>
  );
}
