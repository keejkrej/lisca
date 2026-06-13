import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

const ICON_SKIP_CLASS =
  /^(?:text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[)|font-|leading-|tracking-|pointer-events-none|transition-colors|select-text|antialiased|size-|shrink-0|overflow-visible|leading-none)/;

function iconColorClass(textClass?: string, className?: string): string {
  const merged = [iconContextClass(textClass), layoutClassName(className)].filter(Boolean).join(" ");
  if (!merged) return "text-foreground";
  const tokens = merged.split(/\s+/).filter(Boolean);
  const hasSemantic = tokens.some((token) =>
    /^(text-(primary|secondary|destructive|accent)-foreground|group-(hover|active):text-)/.test(token),
  );
  if (hasSemantic) {
    const filtered = tokens.filter((token) => token !== "text-foreground");
    return filtered.length > 0 ? filtered.join(" ") : "text-foreground";
  }
  return merged;
}

function layoutClassName(className?: string): string | undefined {
  if (!className) return undefined;
  const kept = className.split(/\s+/).filter((token) => token && !ICON_SKIP_CLASS.test(token));
  return kept.length > 0 ? kept.join(" ") : undefined;
}

function iconContextClass(textClass?: string): string | undefined {
  if (!textClass) return undefined;
  const kept = textClass.split(/\s+/).filter((token) => token && !ICON_SKIP_CLASS.test(token));
  return kept.length > 0 ? kept.join(" ") : undefined;
}

function sizeFromClassName(className: string | undefined, fallback: number): number {
  if (!className) return fallback;
  if (/\bsize-3\.5\b/.test(className)) return 14;
  if (/\bsize-3\b/.test(className)) return 12;
  if (/\bsize-4\b/.test(className)) return 16;
  if (/\bsize-5\b/.test(className)) return 20;
  if (/\bsize-6\b/.test(className)) return 24;
  return fallback;
}

type IconProps = LucideProps & {
  as: LucideIcon;
} & React.RefAttributes<LucideIcon>;

/**
 * Lucide icon wrapper. Color utilities live on a surrounding `View` so Expo web
 * does not apply `className` to SVG child paths (which skews the glyph).
 */
function Icon({ as: IconComponent, className, size, ...props }: IconProps) {
  const textClass = React.useContext(TextClassContext);
  const resolvedSize = size ?? sizeFromClassName(className, 14);

  return (
    <View
      className={cn(
        "shrink-0 items-center justify-center overflow-visible leading-none",
        iconColorClass(textClass, className),
      )}
    >
      <IconComponent color="currentColor" size={resolvedSize} {...props} />
    </View>
  );
}

export { Icon };
