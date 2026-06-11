import type { ResultPanel } from "../shared/panels";
import type { ChartSpecKind } from "./spec";

export type ChartPlatform = "web" | "native";

export const PANEL_RENDER_CAPABILITIES = {
  web: {
    timeseries: true,
    boxplot: true,
    histogram: true,
    generic: true,
  },
  native: {
    timeseries: true,
    boxplot: true,
    histogram: true,
    generic: true,
  },
} as const satisfies Record<ChartPlatform, Record<ResultPanel["kind"], boolean>>;

export function panelKind(panel: ResultPanel): ResultPanel["kind"] {
  return panel.kind;
}

export function isPanelKindSupportedOn(
  platform: ChartPlatform,
  kind: ResultPanel["kind"],
): boolean {
  return PANEL_RENDER_CAPABILITIES[platform][kind];
}

export function isPanelRenderableOn(platform: ChartPlatform, panel: ResultPanel): boolean {
  return isPanelKindSupportedOn(platform, panel.kind);
}

export function isChartSpecKindSupportedOn(
  platform: ChartPlatform,
  kind: ChartSpecKind,
): boolean {
  if (kind === "line") return PANEL_RENDER_CAPABILITIES[platform].generic;
  return PANEL_RENDER_CAPABILITIES[platform][kind];
}

export function filterRenderablePanels(platform: ChartPlatform, panels: ResultPanel[]): ResultPanel[] {
  return panels.filter((panel) => isPanelRenderableOn(platform, panel));
}

export function unsupportedPanelLabel(kind: ResultPanel["kind"]): string {
  return `Chart type "${kind}" is not supported on this platform.`;
}
