import { View } from "react-native";

import { Text } from "../../../components/ui/text";
import { Slider } from "../../shell/chrome/slider";

export function AnnotationToolSlider(props: {
  label: string;
  value: number;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <View className="min-w-0 gap-1">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-xs font-medium text-muted-foreground">{props.label}</Text>
        <Text className="text-xs tabular-nums text-muted-foreground">{props.valueLabel}</Text>
      </View>
      <Slider
        disabled={props.disabled}
        maximumValue={props.max}
        minimumValue={props.min}
        step={props.step}
        style={{ width: "100%", height: 32 }}
        value={props.value}
        onValueChange={props.onChange}
      />
    </View>
  );
}
