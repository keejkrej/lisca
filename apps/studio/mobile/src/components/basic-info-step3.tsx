import { Button, Input, Section, Text } from "@lisca/ui-native";
import { ScrollView, View } from "react-native";

import { type BasicInfoSlideId, useStudioStore } from "../state/studio-store";

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
    <View className="w-full gap-2">
      <Section contentClassName="gap-2" title="Slide">
        <View className="flex-row gap-2">
          {SLIDE_OPTIONS.map(({ id, label }) => (
            <View key={id} className="flex-1">
              <Button
                label={label}
                variant={info3.selectedSlideId === id ? "default" : "outline"}
                onPress={() => setInfo3({ selectedSlideId: id })}
              />
            </View>
          ))}
        </View>
      </Section>
      <Section contentClassName="gap-2" title="Samples">
        <Text className="text-sm text-muted-foreground">
          Position start and finish use 1-based indexing (Pos1, Pos2, …).
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="min-w-[720px] gap-2">
            <View className="flex-row gap-2 border-b border-border pb-1.5">
              {["Channel", "Name", "Start", "Finish", "Mask", "Signal"].map((heading) => (
                <Text key={heading} className="w-24 text-xs font-medium text-muted-foreground">
                  {heading}
                </Text>
              ))}
            </View>
            {activeSamples.map((row, index) => (
              <View key={row.id} className="flex-row gap-2">
                <Input
                  className="w-24"
                  keyboardType="numeric"
                  value={row.channel}
                  onChangeText={(channel) => updateInfo3Sample(index, { channel })}
                />
                <Input
                  className="w-[120px]"
                  value={row.name}
                  onChangeText={(name) => updateInfo3Sample(index, { name })}
                />
                <Input
                  className="w-24"
                  keyboardType="numeric"
                  value={row.positionStart}
                  onChangeText={(positionStart) => updateInfo3Sample(index, { positionStart })}
                />
                <Input
                  className="w-24"
                  keyboardType="numeric"
                  value={row.positionFinish}
                  onChangeText={(positionFinish) => updateInfo3Sample(index, { positionFinish })}
                />
                <Input
                  className="w-24"
                  keyboardType="numeric"
                  value={row.maskChannel}
                  onChangeText={(maskChannel) => updateInfo3Sample(index, { maskChannel })}
                />
                <Input
                  className="w-24"
                  keyboardType="numeric"
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
