import { cn } from "../lib/utils";

/** Dock strip base — sections stretch to the full dock band height. */
export const dockLayoutClass =
  "grid h-full min-h-0 w-full items-stretch justify-center gap-3 p-3";

/** Two-panel dock (aligner, annotator). */
export const dockLayout2Class = cn(
  dockLayoutClass,
  "grid-cols-[repeat(2,minmax(0,24rem))]",
);

/** Three-panel dock (studio). */
export const dockLayout3Class = cn(
  dockLayoutClass,
  "mx-auto w-full max-w-5xl grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)]",
);

export const dockSectionClass = "flex h-full min-h-0 min-w-0 w-full flex-col";

/** Flat section content grids (`space-y-0` overrides Section spacing). */
export const dockGridClass = "grid gap-2 space-y-0";

/** 2×2 tool grid (align tools, annotator tools). */
export const dockToolGridClass = cn(dockGridClass, "grid-cols-2 grid-rows-2");

/** 3×2 save grid (align save paths + actions). */
export const dockSaveGrid3Class = cn(dockGridClass, "grid-cols-3 grid-rows-2");

/** 2×2 save grid (annotator paths + action). */
export const dockSaveGrid2Class = cn(dockGridClass, "grid-cols-2 grid-rows-2");

export function dockLayout(...classes: (string | undefined)[]) {
  return cn(dockLayoutClass, ...classes);
}

export function dockSection(...classes: (string | undefined)[]) {
  return cn(dockSectionClass, ...classes);
}
