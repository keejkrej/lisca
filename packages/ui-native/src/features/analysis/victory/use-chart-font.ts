import { matchFont, type SkFont } from "@shopify/react-native-skia";
import { Platform } from "react-native";

export function useChartFont(): SkFont | null {
  return matchFont({
    fontFamily: Platform.select({
      ios: "Helvetica",
      android: "sans-serif",
      default: "system-ui",
    }),
    fontSize: 12,
    fontWeight: "500",
  });
}

export function axisTitle(text: string, font: SkFont | null) {
  return {
    text,
    font,
  };
}

export function axisStyle(colors: { grid: string; mutedText: string }) {
  return {
    lineColor: colors.grid,
    labelColor: colors.mutedText,
  } as const;
}

export function pointY(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
