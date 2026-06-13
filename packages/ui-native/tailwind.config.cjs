const path = require("node:path");
const { hairlineWidth } = require("nativewind/theme");

const { liscaFontFamily } = require("./tailwind/lisca-fonts.cjs");
const liscaFontsPlugin = require("./tailwind/lisca-fonts-plugin.cjs");

const root = __dirname;
const appsRoot = path.join(root, "../../apps");

/** Scoped globs — avoid broad mobile globs that scan node_modules and stall Metro. */
const mobileAppContent = ["aligner", "annotator", "studio"].flatMap((app) => [
  path.join(appsRoot, `${app}/mobile/app/**/*.{ts,tsx}`),
  path.join(appsRoot, `${app}/mobile/src/**/*.{ts,tsx}`),
]);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    path.join(root, "src/**/*.{ts,tsx}"),
    path.join(root, "components/**/*.{ts,tsx}"),
    path.join(root, "lib/**/*.{ts,tsx}"),
    path.join(root, "../mobile-app/src/**/*.{ts,tsx}"),
    ...mobileAppContent,
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: [liscaFontFamily.sansRegular],
        display: [liscaFontFamily.displaySemibold],
        mono: [liscaFontFamily.monoRegular],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [liscaFontsPlugin, require("tailwindcss-animate")],
};
