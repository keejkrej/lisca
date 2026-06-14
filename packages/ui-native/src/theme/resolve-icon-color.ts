import type { ShellThemeColors } from "./tokens";

const SEMANTIC_TEXT_COLORS: Record<string, keyof ShellThemeColors | "white"> = {
  "text-foreground": "foreground",
  "text-muted-foreground": "mutedForeground",
  "text-primary": "primary",
  "text-primary-foreground": "primaryForeground",
  "text-secondary-foreground": "secondaryForeground",
  "text-accent-foreground": "accentForeground",
  "text-destructive-foreground": "destructiveForeground",
  "text-white": "white",
};

const SEMANTIC_PRIORITY: (keyof typeof SEMANTIC_TEXT_COLORS)[] = [
  "text-primary-foreground",
  "text-white",
  "text-destructive-foreground",
  "text-secondary-foreground",
  "text-accent-foreground",
  "text-primary",
  "text-muted-foreground",
  "text-foreground",
];

function opacityFromClasses(classes: string): number {
  const match = classes.match(/\bopacity-(\d+)\b/);
  if (!match) return 1;
  return Number(match[1]) / 100;
}

function applyOpacity(color: string, opacity: number): string {
  if (opacity >= 1) return color;
  const hex = color.replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function collectColorTokens(textClass?: string, className?: string): string[] {
  const explicit = (className ?? "")
    .split(/\s+/)
    .filter((token) => token.startsWith("text-") && !token.startsWith("group-"));
  if (explicit.length > 0) return explicit;

  const contextual = (textClass ?? "")
    .split(/\s+/)
    .filter((token) => token.startsWith("text-") && !token.startsWith("group-"));
  if (contextual.length > 0) return contextual;

  return (textClass ?? "")
    .split(/\s+/)
    .filter((token) => /^group-(?:hover|active):text-/.test(token))
    .map((token) => token.replace(/^group-(?:hover|active):/, ""));
}

/** Maps Tailwind text color utilities to literal colors for native SVG icons. */
export function resolveIconColorFromClasses(
  classes: string,
  colors: ShellThemeColors,
  textClass?: string,
  className?: string,
): string {
  const tokens = collectColorTokens(textClass, className);
  const merged = [classes, className, textClass].filter(Boolean).join(" ");
  const opacity = opacityFromClasses(merged);

  for (const token of SEMANTIC_PRIORITY) {
    if (!tokens.includes(token)) continue;
    const mapped = SEMANTIC_TEXT_COLORS[token];
    const base = mapped === "white" ? "#ffffff" : colors[mapped];
    return applyOpacity(base, opacity);
  }

  return applyOpacity(colors.foreground, opacity);
}
