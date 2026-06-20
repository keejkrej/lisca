import { VICTORY_DOMAIN_PADDING } from "@lisca/analysis/charts";
import type { ComponentType, ReactNode } from "react";
import { CartesianChart, type PointsArray } from "victory-native";
import { ChartShell } from "./chart-shell";
import type { ResultChartColors } from "./types";
import { axisStyle, axisTitle, useChartFont } from "./use-chart-font";

export type VictoryRenderArgs = {
  points: Record<string, PointsArray>;
  chartBounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
};

type SpecCartesianChartProps = {
  title: string;
  width: number;
  height: number;
  colors: ResultChartColors;
  data: Array<Record<string, number | string>>;
  xKey: string;
  yKeys: string[];
  xAxisTitle: string;
  yAxisTitle: string;
  formatXLabel?: (value: number | string) => string;
  labelRotate?: number;
  children: (args: VictoryRenderArgs) => ReactNode;
};

export function SpecCartesianChart(props: SpecCartesianChartProps) {
  const font = useChartFont();
  const axis = axisStyle(props.colors);
  const VictoryChart = CartesianChart as ComponentType<{
    data: SpecCartesianChartProps["data"];
    domainPadding: typeof VICTORY_DOMAIN_PADDING;
    xAxis: object;
    xKey: string;
    yAxis: object[];
    yKeys: string[];
    children: SpecCartesianChartProps["children"];
  }>;

  return (
    <ChartShell colors={props.colors} height={props.height} title={props.title} width={props.width}>
      <VictoryChart
        data={props.data}
        domainPadding={VICTORY_DOMAIN_PADDING}
        xAxis={{
          font,
          formatXLabel: props.formatXLabel,
          labelRotate: props.labelRotate,
          title: axisTitle(props.xAxisTitle, font),
          ...axis,
        }}
        xKey={props.xKey}
        yAxis={[
          {
            font,
            title: axisTitle(props.yAxisTitle, font),
            ...axis,
          },
        ]}
        yKeys={props.yKeys}
      >
        {props.children}
      </VictoryChart>
    </ChartShell>
  );
}
