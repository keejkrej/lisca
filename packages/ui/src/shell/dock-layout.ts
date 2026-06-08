import { cn } from "../lib/utils";

/** Horizontal dock row; centers section panels on wide viewports. */
export const dockLayoutClass = "flex h-full min-h-0 w-full justify-center gap-3 p-3";

/** Dock {@link Section} panel — caps width so tool grids and action buttons stay compact. */
export const dockSectionClass =
  "flex min-h-0 min-w-0 w-full max-w-sm flex-1 basis-0 flex-col";

export function dockLayout(...classes: (string | undefined)[]) {
  return cn(dockLayoutClass, ...classes);
}

export function dockSection(...classes: (string | undefined)[]) {
  return cn(dockSectionClass, ...classes);
}
