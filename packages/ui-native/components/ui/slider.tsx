import SliderImport from "@react-native-community/slider";
import type { SliderProps } from "@react-native-community/slider";

import { useThemeColors } from "../../src/theme/use-theme-colors";

export function Slider(props: SliderProps) {
  const colors = useThemeColors();
  const NativeSlider = SliderImport as unknown as React.ComponentType<SliderProps>;

  return (
    <NativeSlider
      maximumTrackTintColor={colors.border}
      minimumTrackTintColor={colors.primary}
      thumbTintColor={colors.primary}
      {...props}
    />
  );
}
