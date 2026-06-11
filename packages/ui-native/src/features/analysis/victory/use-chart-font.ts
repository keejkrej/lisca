import { matchFont, type SkFont } from "@shopify/react-native-skia";

import { liscaFontFamily } from "../../../theme/typography";

export function useChartFont(): SkFont | null {
  return matchFont({
    fontFamily: liscaFontFamily.sansMedium,
    fontSize: 12,
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
