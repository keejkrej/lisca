import SliderImport from "@react-native-community/slider";
import type { SliderProps } from "@react-native-community/slider";
import { useColorScheme } from "nativewind";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { cn } from "@/lib/utils";
import { useThemeColors } from "../../src/theme/use-theme-colors";

/** Layout box for the slider row; thumb may extend slightly outside on web. */
const SLIDER_HEIGHT = 12;

/** Web `@lisca/ui` slider thumb at `sm` — `size-4` (16px). */
const WEB_THUMB_SIZE = 16;

/** Web track — `h-1` (4px). */
const WEB_TRACK_HEIGHT = 4;

/** Matches web `data-disabled:opacity-64` on slider controls. */
const DISABLED_SLIDER_STYLE: ViewStyle = {
  opacity: 0.64,
  ...(Platform.OS === "web" ? { pointerEvents: "none" as const } : null),
};

type WebSliderProps = SliderProps & {
  thumbSize?: number;
  trackHeight?: number;
  thumbStyle?: ViewStyle;
};

function webThumbStyle(isDark: boolean, colors: ReturnType<typeof useThemeColors>): ViewStyle {
  return {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: isDark ? colors.background : colors.input,
    boxShadow: "0 1px rgba(0, 0, 0, 0.04)",
  };
}

export function Slider({ style, disabled, ...props }: SliderProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const NativeSlider = SliderImport as unknown as React.ComponentType<WebSliderProps>;
  const isWeb = Platform.OS === "web";
  const flatStyle = StyleSheet.flatten(style as StyleProp<ViewStyle>);
  const customHeight = typeof flatStyle?.height === "number" ? flatStyle.height : undefined;
  const trackBoxHeight = customHeight ?? SLIDER_HEIGHT;
  /** Web contrast rows keep a 6px layout box (`pt-0.5` + 4px track); thumb overflows. */
  const wrapperHeight = customHeight != null ? customHeight + 2 : undefined;

  return (
    <View
      className={cn(
        "w-full overflow-visible",
        disabled && Platform.OS !== "web" && "pointer-events-none opacity-64",
      )}
      style={[
        disabled ? DISABLED_SLIDER_STYLE : undefined,
        wrapperHeight != null ? { height: wrapperHeight } : undefined,
      ]}
    >
      <NativeSlider
        {...props}
        disabled={disabled}
        maximumTrackTintColor={colors.border}
        minimumTrackTintColor={colors.primary}
        style={[{ width: "100%", height: trackBoxHeight }, style]}
        thumbSize={isWeb ? WEB_THUMB_SIZE : undefined}
        thumbStyle={isWeb ? webThumbStyle(isDark, colors) : undefined}
        thumbTintColor={isWeb ? "#ffffff" : colors.primary}
        trackHeight={isWeb ? (customHeight ?? WEB_TRACK_HEIGHT) : undefined}
      />
    </View>
  );
}
