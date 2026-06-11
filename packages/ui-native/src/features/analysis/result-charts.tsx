import type { ResultPanel } from "@lisca/analysis";
import {
  chartSpecForPanel,
  filterRenderablePanels,
  isChartSpecKindSupportedOn,
  unsupportedPanelLabel,
} from "@lisca/analysis/charts";
import { StyleSheet, View } from "react-native";
import { UnsupportedChart } from "./victory/chart-shell";
import { VictoryChartFromSpec } from "./victory/chart-from-spec";
import { DEFAULT_RESULT_CHART_COLORS, type ResultChartColors } from "./victory/types";

export function ResultPanelChart(props: {
  panel: ResultPanel;
  width: number;
  height: number;
  colors?: Partial<ResultChartColors>;
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
      title={props.panel.title}
      width={props.width}
    />
  );
}

export function ResultPanelsGridView(props: {
  panels: ResultPanel[];
  width: number;
  panelHeight?: number;
  colors?: Partial<ResultChartColors>;
}) {
  const panelHeight = props.panelHeight ?? 280;
  const renderablePanels = filterRenderablePanels("native", props.panels);

  return (
    <View style={styles.grid}>
      {renderablePanels.map((panel) => (
        <ResultPanelChart
          key={`${panel.kind}:${panel.path}:${panel.title}`}
          colors={props.colors}
          height={panelHeight}
          panel={panel}
          width={props.width}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 16,
  },
});
