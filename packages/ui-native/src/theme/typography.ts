import type { TextStyle } from "react-native";

/** PostScript names from @expo-google-fonts — must match LiscaFontsProvider and tailwind/lisca-fonts.cjs. */
export const liscaFontFamily = {
  sansRegular: "IBMPlexSans_400Regular",
  sansMedium: "IBMPlexSans_500Medium",
  sansSemibold: "IBMPlexSans_600SemiBold",
  sansBold: "IBMPlexSans_700Bold",
  monoRegular: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
  displaySemibold: "BricolageGrotesque_600SemiBold",
  displayBold: "BricolageGrotesque_700Bold",
} as const;

/** Shared text presets — use fontFamily per weight (RN custom fonts). */
export const liscaType = {
  body: { fontFamily: liscaFontFamily.sansRegular, fontSize: 14 } satisfies TextStyle,
  bodyMedium: { fontFamily: liscaFontFamily.sansMedium, fontSize: 14 } satisfies TextStyle,
  bodySmall: { fontFamily: liscaFontFamily.sansRegular, fontSize: 12 } satisfies TextStyle,
  bodySmallMedium: { fontFamily: liscaFontFamily.sansMedium, fontSize: 12 } satisfies TextStyle,
  caption: { fontFamily: liscaFontFamily.sansRegular, fontSize: 13 } satisfies TextStyle,
  sectionTitle: { fontFamily: liscaFontFamily.displaySemibold, fontSize: 14 } satisfies TextStyle,
  panelTitle: { fontFamily: liscaFontFamily.displaySemibold, fontSize: 13 } satisfies TextStyle,
  dialogTitle: { fontFamily: liscaFontFamily.displaySemibold, fontSize: 18 } satisfies TextStyle,
  navTitle: { fontFamily: liscaFontFamily.displaySemibold, fontSize: 18 } satisfies TextStyle,
  statLabel: { fontFamily: liscaFontFamily.sansRegular, fontSize: 12 } satisfies TextStyle,
  statValue: { fontFamily: liscaFontFamily.displaySemibold, fontSize: 16 } satisfies TextStyle,
  mono: { fontFamily: liscaFontFamily.monoRegular, fontSize: 12 } satisfies TextStyle,
  monoMedium: { fontFamily: liscaFontFamily.monoMedium, fontSize: 12 } satisfies TextStyle,
} as const;
