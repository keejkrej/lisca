import { StyleSheet } from "react-native";

import { shellChromeMetrics } from "../chrome/shell-chrome";

export const dockToolbarGap = 8;
export const dockToolbarRowHeight = shellChromeMetrics.height;

/** Min height for a dock toolbar with `rows` button rows and standard gap. */
export function dockToolbarMinHeight(rows: number): number {
  if (rows <= 0) return 0;
  return rows * dockToolbarRowHeight + (rows - 1) * dockToolbarGap;
}

/** Mirrors web dock grids: `flex flex-col gap-2` wrapper. */
export const dockLayoutStyles = StyleSheet.create({
  section: {
    minWidth: 0,
  },
  content: {
    flex: 1,
    gap: dockToolbarGap,
    justifyContent: "flex-start",
    minHeight: 0,
    width: "100%",
  },
  stack: {
    flexDirection: "column",
    gap: dockToolbarGap,
    width: "100%",
  },
  /** Web `grid-cols-2 gap-2`. */
  cols2: {
    flexDirection: "row",
    gap: dockToolbarGap,
    width: "100%",
  },
  /** Web `grid-cols-3 gap-2`. */
  cols3: {
    flexDirection: "row",
    gap: dockToolbarGap,
    width: "100%",
  },
  toolbar: {
    flexDirection: "column",
    gap: dockToolbarGap,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: dockToolbarGap,
    width: "100%",
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  button: {
    width: "100%",
  },
  saveContent: {
    flexDirection: "column",
    gap: dockToolbarGap,
    width: "100%",
  },
  classificationPlaceholder: {
    justifyContent: "flex-start",
    minHeight: dockToolbarMinHeight(3),
    width: "100%",
  },
});
