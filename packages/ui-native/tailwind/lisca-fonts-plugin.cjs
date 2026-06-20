const plugin = require("tailwindcss/plugin");

const { liscaFontFamily } = require("./lisca-fonts.cjs");

/**
 * React Native loads one font file per weight. Map Tailwind font stack + weight
 * classes to the correct fontFamily (mirrors web `--font-sans` / `--font-display` / `--font-mono`).
 */
module.exports = plugin(({ addUtilities }) => {
  const {
    sansRegular,
    sansMedium,
    sansSemibold,
    sansBold,
    monoRegular,
    monoMedium,
    displaySemibold,
    displayBold,
  } = liscaFontFamily;

  /** Avoid synthetic bolding when Tailwind also emits fontWeight. */
  const face = (fontFamily) => ({ fontFamily, fontWeight: "400" });

  addUtilities({
    ".font-sans": face(sansRegular),
    ".font-display": face(displaySemibold),
    ".font-mono": face(monoRegular),
    ".font-normal": face(sansRegular),
    ".font-medium": face(sansMedium),
    ".font-semibold": face(sansSemibold),
    ".font-bold": face(sansBold),
    ".font-extrabold": face(sansBold),
    ".font-display.font-normal": face(displaySemibold),
    ".font-display.font-medium": face(displaySemibold),
    ".font-display.font-semibold": face(displaySemibold),
    ".font-display.font-bold": face(displayBold),
    ".font-display.font-extrabold": face(displayBold),
    ".font-mono.font-normal": face(monoRegular),
    ".font-mono.font-medium": face(monoMedium),
    ".font-mono.font-semibold": face(monoMedium),
    ".font-mono.font-bold": face(monoMedium),
    ".font-mono.font-extrabold": face(monoMedium),
  });
});
