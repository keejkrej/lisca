export type ChartPoint = {
  x: number;
  y: number;
};

export type AxisScale = "linear" | "log";

export type AxisSpec = {
  label: string;
  grid?: boolean;
  tickFormat?: string;
  categoryDomain?: string[];
  numericDomain?: [number, number];
  tickRotate?: number;
  type?: AxisScale;
};

export type LineSeriesSpec = {
  key: string;
  points: ChartPoint[];
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
};

export type BoxPlotGroupSpec = {
  label: string;
  values: number[];
  stats: {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  };
};

export type HistogramBinSpec = {
  x0: number;
  x1: number;
  count: number;
};

export type TimeseriesChartSpec = {
  kind: "timeseries";
  x: AxisSpec;
  y: AxisSpec;
  traces: LineSeriesSpec[];
  medianTrace: ChartPoint[];
};

export type GenericLineChartSpec = {
  kind: "line";
  x: AxisSpec;
  y: AxisSpec;
  series: LineSeriesSpec[];
  legend?: boolean;
};

export type BoxPlotChartSpec = {
  kind: "boxplot";
  x: AxisSpec;
  y: AxisSpec;
  groups: BoxPlotGroupSpec[];
};

export type HistogramChartSpec = {
  kind: "histogram";
  x: AxisSpec;
  y: AxisSpec;
  bins: HistogramBinSpec[];
};

export type ChartSpec =
  | TimeseriesChartSpec
  | GenericLineChartSpec
  | BoxPlotChartSpec
  | HistogramChartSpec;

export type ChartSpecKind = ChartSpec["kind"];
