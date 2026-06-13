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

export function ResultPanelChart(props: {
  panel: ResultPanel;
  width: number;
  height: number;
  colors?: Partial<ResultChartColors>;
  exportMode?: boolean;
}) {
  const colors = { ...DEFAULT_RESULT_CHART_COLORS, ...props.colors };
  const spec = chartSpecForPanel(props.panel);
  if (!spec) return null;
  if (!isChartSpecKindSupportedOn("native", spec.kind)) {
    return (
      <UnsupportedChart
        colors={colors}
        height={props.height}
        message={unsupportedPanelLabel(props.panel.kind)}
        title={props.panel.title}
        width={props.width}
      />
    );
  }
  return (
    <VictoryChartFromSpec
      colors={colors}
      height={props.height}
      spec={spec}
      title={props.exportMode ? "" : props.panel.title}
      width={props.width}
    />
  );
}

function panelLayout(section: ResultPlotSection, exportMode: boolean) {
  const isParameters = section === "parameters";
  if (isParameters) {
    return {
      columns: 1,
      panelHeight: exportMode ? 500 : 560,
      panelWidth: exportMode ? EXPORT_WIDTH - 32 : undefined,
    };
  }
  return {
    columns: exportMode ? 2 : 1,
    panelHeight: exportMode ? 340 : 280,
    panelWidth: exportMode ? (EXPORT_WIDTH - 48) / 2 : undefined,
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
  const layout = panelLayout(section, exportMode);
  const panelHeight = props.panelHeight ?? layout.panelHeight;
  const containerWidth = exportMode ? EXPORT_WIDTH : props.width;
  const panelWidth = layout.panelWidth ?? props.width;
  const renderablePanels = filterRenderablePanels("native", props.panels);

  if (renderablePanels.length === 0) return null;

  return (
    <View
      ref={ref}
      collapsable={false}
      className={exportMode ? "overflow-visible bg-white" : "gap-4"}
      style={exportMode ? { width: EXPORT_WIDTH, backgroundColor: "#ffffff" } : undefined}
    >
      {props.pageTitle ? (
        <View className={exportMode ? "border-b border-[#e5e5e5] px-4 py-3" : "border-b px-4 py-3"}>
          <Text
            className={
              exportMode ? "text-2xl font-semibold text-[#171717]" : "text-2xl font-semibold text-foreground"
            }
          >
            {props.pageTitle}
          </Text>
        </View>
      ) : null}
      <View
        className={exportMode ? "flex-row flex-wrap gap-6 p-4" : "gap-4"}
        style={exportMode ? { width: containerWidth } : undefined}
      >
        {renderablePanels.map((panel) => (
          <View
            key={`${panel.kind}:${panel.path}:${panel.title}`}
            className={exportMode ? "gap-1" : undefined}
            style={
              exportMode
                ? {
                    width: layout.columns === 2 ? panelWidth : containerWidth - 32,
                    minHeight: panelHeight + 32,
                  }
                : undefined
            }
          >
            {exportMode ? (
              <Text className="truncate px-1 text-xl font-semibold text-[#737373]" numberOfLines={1}>
                {panel.title}
              </Text>
            ) : null}
            <ResultPanelChart
              colors={props.colors}
              exportMode={exportMode}
              height={panelHeight}
              panel={panel}
              width={exportMode ? panelWidth : props.width}
            />
          </View>
        ))}
      </View>
    </View>
  );
});
