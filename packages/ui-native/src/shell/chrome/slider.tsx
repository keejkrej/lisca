import SliderImport from "@react-native-community/slider";
import type { SliderProps } from "@react-native-community/slider";

export function Slider(props: SliderProps) {
  const NativeSlider = SliderImport as unknown as React.ComponentType<SliderProps>;
  return <NativeSlider {...props} />;
}
