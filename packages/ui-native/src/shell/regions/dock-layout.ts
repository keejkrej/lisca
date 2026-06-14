import { shellChromeMetrics } from "../chrome/shell-chrome";

export const dockToolbarGap = 8;
export const dockToolbarRowHeight = shellChromeMetrics.height;

/** Min height for a dock toolbar with `rows` button rows and standard gap. */
export function dockToolbarMinHeight(rows: number): number {
  if (rows <= 0) return 0;
  return rows * dockToolbarRowHeight + (rows - 1) * dockToolbarGap;
}

/** Min width for dock tool/save bands — `w-max` hug collapses when native flex rows lack intrinsic width. */
export const dockSectionWidths = {
  tool: "w-[375px] max-w-[375px] shrink-0",
  save: "w-[420px] max-w-[420px] shrink-0",
} as const;

/** Tailwind class sets for dock toolbars. */
export const dockLayoutClasses = {
  section: "min-w-0",
  content: "min-h-0 w-full flex-1 justify-center gap-2",
  stack: "w-full flex-col gap-2",
  cols2: "w-full flex-row gap-2",
  cols3: "w-full flex-row gap-2",
  toolbar: "w-full flex-col gap-2",
  row: "w-full flex-row gap-2",
  cell: "min-w-0 flex-1",
  gridCell: "min-w-0 flex-1",
  button: "w-full",
  /** @deprecated Use {@link dockLayoutClasses.content} — dock sections center content by default. */
  saveContent: "min-h-0 w-full flex-1 justify-center gap-2",
  classificationPlaceholder: "w-full justify-center",
} as const;

/** @deprecated Use {@link dockLayoutClasses} with `className`. */
export const dockLayoutStyles = dockLayoutClasses;
