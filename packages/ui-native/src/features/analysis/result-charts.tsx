import type { ResultPanel, ResultPlotSection } from "@lisca/analysis";
import {
  chartSpecForPanel,
  filterRenderablePanels,
  isChartSpecKindSupportedOn,
  unsupportedPanelLabel,
} from "@lisca/analysis/charts";
import { forwardRef, type Ref } from "react";
import { View } from "react-native";

import { Text } from "../../../components/ui/text";
import { UnsupportedChart } from "./victory/chart-shell";
import { VictoryChartFromSpec } from "./victory/chart-from-spec";
import { DEFAULT_RESULT_CHART_COLORS, type ResultChartColors } from "./victory/types";

const EXPORT_WIDTH = 1200;
/** Min container width for a two-column result chart grid on tablet landscape. */
const TABLET_LANDSCAPE_MIN_WIDTH = 1024;

export function ResultPanelChart(props: {
  panel: ResultPanel;
  width: number;
  height: number;
  colors?: Partial<ResultChartColors>;
  exportMode?: boolean;
  showTitle?: boolean;
}) {
  const colors = { ...DEFAULT_RESULT_CHART_COLORS, ...props.colors };
  const spec = chartSpecForPanel(props.panel);
  const showTitle = props.showTitle ?? false;
  if (!spec) return null;
  if (!isChartSpecKindSupportedOn("native", spec.kind)) {
    return (
      <UnsupportedChart
        colors={colors}
        height={props.height}
        message={unsupportedPanelLabel(props.panel.kind)}
        title={showTitle ? props.panel.title : ""}
        width={props.width}
      />
    );
  }
  return (
    <VictoryChartFromSpec
      colors={colors}
      height={props.height}
      spec={spec}
      title={showTitle ? props.panel.title : ""}
      width={props.width}
    />
  );
}

function panelLayout(section: ResultPlotSection, exportMode: boolean, containerWidth: number) {
  const isParameters = section === "parameters";
  if (isParameters) {
    return {
      columns: 1,
      panelHeight: exportMode ? 500 : 540,
      cellMinHeight: exportMode ? 520 : 560,
      gap: 32,
      panelWidth: exportMode ? EXPORT_WIDTH - 32 : containerWidth,
    };
  }
  const columns = exportMode ? 2 : containerWidth >= TABLET_LANDSCAPE_MIN_WIDTH ? 2 : 1;
  const gap = 24;
  return {
    columns,
    panelHeight: exportMode ? 340 : 300,
    cellMinHeight: exportMode ? 360 : 320,
    gap,
    panelWidth: exportMode
      ? (EXPORT_WIDTH - 48) / 2
      : columns === 2
        ? (containerWidth - gap) / 2
        : containerWidth,
  };
}

export const ResultPanelsGridView = forwardRef(function ResultPanelsGridView(
  props: {
    panels: ResultPanel[];
    width: number;
    panelHeight?: number;
    colors?: Partial<ResultChartColors>;
    exportMode?: boolean;
    pageTitle?: string;
    section?: ResultPlotSection;
  },
  ref: Ref<View>,
) {
  const exportMode = props.exportMode ?? false;
  const section = props.section ?? "timeseries";
  const containerWidth = exportMode ? EXPORT_WIDTH : props.width;
  const layout = panelLayout(section, exportMode, containerWidth);
  const panelHeight = props.panelHeight ?? layout.panelHeight;
  const renderablePanels = filterRenderablePanels("native", props.panels);

  if (renderablePanels.length === 0) return null;

  return (
    <View
      ref={ref}
      collapsable={false}
      className={exportMode ? "overflow-visible bg-white" : "min-h-0 flex-1"}
      style={exportMode ? { width: EXPORT_WIDTH, backgroundColor: "#ffffff" } : undefined}
    >
      {props.pageTitle ? (
        <View className={exportMode ? "border-b border-[#e5e5e5] px-4 py-3" : "border-b px-4 py-3"}>
          <Text
            className={
              exportMode
                ? "text-2xl font-semibold text-[#171717]"
                : "text-2xl font-semibold text-foreground"
            }
          >
            {props.pageTitle}
          </Text>
        </View>
      ) : null}
      <View
        className={exportMode ? "flex-row flex-wrap gap-6 p-4" : "flex-row flex-wrap gap-6 p-4"}
        style={exportMode ? { width: containerWidth } : undefined}
      >
        {renderablePanels.map((panel) => (
          <View
            key={`${panel.kind}:${panel.path}:${panel.title}`}
            className="min-w-0 gap-1"
            style={{
              width: layout.panelWidth,
              minHeight: layout.cellMinHeight,
            }}
          >
            <Text
              className={
                exportMode
                  ? "truncate px-1 text-xl font-semibold text-[#737373]"
                  : "truncate px-1 text-xl font-semibold text-muted-foreground"
              }
              numberOfLines={1}
            >
              {panel.title}
            </Text>
            <View className="min-h-0 flex-1">
              <ResultPanelChart
                colors={props.colors}
                exportMode={exportMode}
                height={panelHeight}
                panel={panel}
                showTitle={false}
                width={layout.panelWidth}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});
