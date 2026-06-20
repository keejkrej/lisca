import {
  BOXPLOT_STROKE,
  boxPlotToVictoryRows,
  histogramToVictoryRows,
  seriesToVictoryRows,
  TIMESERIES_MEDIAN_STROKE,
  traceColor,
  type ChartSpec,
  withMedianYKey,
} from "@lisca/analysis/charts";
import { Bar, Line, type PointsArray } from "victory-native";
import { BoxPlotMarks } from "./box-plot-marks";
import { SpecCartesianChart } from "./spec-cartesian-chart";
import type { ResultChartColors } from "./types";

export function VictoryChartFromSpec(props: {
  spec: ChartSpec;
  title: string;
  width: number;
  height: number;
  colors: ResultChartColors;
}) {
  const { spec } = props;

  if (spec.kind === "timeseries") {
    const base = seriesToVictoryRows(spec.traces);
    const { data, yKeys, medianKey } = withMedianYKey(base.data, base.yKeys, spec.medianTrace);

    return (
      <SpecCartesianChart
        colors={props.colors}
        data={data}
        height={props.height}
        title={props.title}
        width={props.width}
        xAxisTitle={spec.x.label}
        xKey="x"
        yAxisTitle={spec.y.label}
        yKeys={yKeys}
      >
        {({ points }) => (
          <>
            {base.yKeys.map((key, index) => (
              <Line
                key={key}
                color={spec.traces[index]?.stroke ?? traceColor(index)}
                opacity={spec.traces[index]?.strokeOpacity ?? 0.3}
                points={points[key] as PointsArray}
                strokeWidth={spec.traces[index]?.strokeWidth ?? 2}
              />
            ))}
            <Line
              color={TIMESERIES_MEDIAN_STROKE}
              points={points[medianKey] as PointsArray}
              strokeWidth={3}
            />
          </>
        )}
      </SpecCartesianChart>
    );
  }

  if (spec.kind === "line") {
    const { data, yKeys } = seriesToVictoryRows(spec.series);

    return (
      <SpecCartesianChart
        colors={props.colors}
        data={data}
        height={props.height}
        title={props.title}
        width={props.width}
        xAxisTitle={spec.x.label}
        xKey="x"
        yAxisTitle={spec.y.label}
        yKeys={yKeys}
      >
        {({ points }) => (
          <>
            {yKeys.map((key, index) => (
              <Line
                key={key}
                color={spec.series[index]?.stroke ?? traceColor(index)}
                opacity={spec.series[index]?.strokeOpacity ?? 0.55}
                points={points[key] as PointsArray}
                strokeWidth={spec.series[index]?.strokeWidth ?? 2}
              />
            ))}
          </>
        )}
      </SpecCartesianChart>
    );
  }

  if (spec.kind === "histogram") {
    const data = histogramToVictoryRows(spec.bins);

    return (
      <SpecCartesianChart
        colors={props.colors}
        data={data}
        height={props.height}
        title={props.title}
        width={props.width}
        xAxisTitle={spec.x.label}
        xKey="x"
        yAxisTitle={spec.y.label}
        yKeys={["count"]}
      >
        {({ points, chartBounds }) => (
          <Bar
            chartBounds={chartBounds}
            color={props.colors.primary}
            innerPadding={0.2}
            opacity={0.75}
            points={points.count as PointsArray}
          />
        )}
      </SpecCartesianChart>
    );
  }

  const data = boxPlotToVictoryRows(spec.groups);

  return (
    <SpecCartesianChart
      colors={props.colors}
      data={data}
      formatXLabel={(value) => spec.groups[Number(value)]?.label ?? String(value)}
      height={props.height}
      labelRotate={spec.x.tickRotate ?? 0}
      title={props.title}
      width={props.width}
      xAxisTitle={spec.x.label}
      xKey="x"
      yAxisTitle={spec.y.label}
      yKeys={["min", "q1", "median", "q3", "max"]}
    >
      {({ points }) => <BoxPlotMarks color={BOXPLOT_STROKE} groups={spec.groups} points={points} />}
    </SpecCartesianChart>
  );
}
