import type { StudioAnalysisCsvFile } from "@lisca/contracts";
import {
  DISPLAYED_PARAMETER_PLOTS,
  PLOTTED_FIT_PARAMETERS,
  type DisplayedParameterPlotId,
} from "../assays/transfection/catalog";

export type ParsedCsvFile = {
  kind: string;
  fileName: string;
  path: string;
  headers: string[];
  rows: string[][];
};

export type TimeseriesTrace = {
  key: string;
  label: string;
  points: Array<{ x: number; y: number }>;
};

export type TimeseriesPanel = {
  kind: "timeseries";
  title: string;
  fileName: string;
  path: string;
  xAxisLabel: string;
  yAxisLabel: string;
  traces: TimeseriesTrace[];
};

export type BoxPlotStats = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

export type BoxPlotGroup = {
  slideChannel: number;
  label: string;
  values: number[];
  stats: BoxPlotStats;
};

export type BoxPlotPanel = {
  kind: "boxplot";
  title: string;
  fileName: string;
  path: string;
  xAxisLabel: string;
  yAxisLabel: string;
  groups: BoxPlotGroup[];
  yScale?: "linear" | "log";
};

export type GenericLineSeries = {
  dataKey: string;
  label: string;
  points: Array<{ x: number; y: number }>;
};

export type GenericLinePanel = {
  kind: "generic";
  title: string;
  fileName: string;
  path: string;
  xAxisLabel: string;
  yAxisLabel: string;
  series: GenericLineSeries[];
};

export type HistogramPanel = {
  kind: "histogram";
  title: string;
  fileName: string;
  path: string;
  xAxisLabel: string;
  yAxisLabel: string;
  values: number[];
  xDomain?: [number, number];
};

export type ResultPanel = TimeseriesPanel | BoxPlotPanel | GenericLinePanel | HistogramPanel;

export type ResultAssayKind = "transfection" | "killing" | "unknown";

export function displayedParameterPanelId(panel: ResultPanel): DisplayedParameterPlotId | null {
  if (panel.kind !== "boxplot") return null;

  for (const entry of DISPLAYED_PARAMETER_PLOTS) {
    if (panel.yAxisLabel === entry.label) return entry.id;
  }

  return null;
}

export function collectDisplayedParameterPanels(panelsByFile: ResultPanel[][]): ResultPanel[] {
  const byId = new Map<DisplayedParameterPlotId, ResultPanel>();

  for (const panels of panelsByFile) {
    for (const panel of panels) {
      const id = displayedParameterPanelId(panel);
      if (id && !byId.has(id)) {
        byId.set(id, panel);
      }
    }
  }

  return DISPLAYED_PARAMETER_PLOTS.flatMap((entry) => {
    const panel = byId.get(entry.id);
    return panel ? [{ ...panel, title: entry.label }] : [];
  });
}

export function collectTimeseriesPanels(panelsByFile: ResultPanel[][]): ResultPanel[] {
  return panelsByFile.flatMap((panels) => panels.filter((panel) => panel.kind === "timeseries"));
}

export function collectSummaryPanels(panelsByFile: ResultPanel[][]): ResultPanel[] {
  const parameterPanels = collectDisplayedParameterPanels(panelsByFile);
  if (parameterPanels.length > 0) return parameterPanels;

  const summary: ResultPanel[] = [];
  const histograms: HistogramPanel[] = [];
  for (const panels of panelsByFile) {
    for (const panel of panels) {
      if (panel.kind === "generic" && panel.yAxisLabel === "N(alive)") {
        summary.push(panel);
      } else if (panel.kind === "histogram") {
        histograms.push(panel);
      }
    }
  }
  if (histograms.length > 0) {
    const allValues = histograms.flatMap((panel) => panel.values);
    const min = Math.min(0, ...allValues);
    const max = Math.max(...allValues, 0);
    const xDomain: [number, number] = [min, max];
    for (const panel of histograms) {
      summary.push({ ...panel, xDomain });
    }
  }
  return summary;
}

export function inferResultAssayKind(files: StudioAnalysisCsvFile[]): ResultAssayKind {
  if (
    files.some((file) => file.fileName === "kill_curve.csv" || file.fileName === "death_times.csv")
  ) {
    return "killing";
  }
  if (files.some((file) => file.fileName === "auc.csv" || file.fileName === "fit.csv")) {
    return "transfection";
  }
  return "unknown";
}

export function resultSectionLabel(section: ResultPlotSection, assay: ResultAssayKind): string {
  if (section === "timeseries") return "Timeseries";
  if (assay === "killing") return "Survival";
  return "Parameters";
}

export function resultSectionInstruction(
  section: ResultPlotSection,
  assay: ResultAssayKind,
): string {
  if (section === "timeseries") {
    return assay === "killing"
      ? "P(dead) traces for each position. The red line is the median."
      : "Intensity traces for each position. The red line is the median.";
  }
  return assay === "killing"
    ? "Kill curves overlay samples; death-time histograms share a time axis."
    : "Parameter plots: mRNA lifetime, AUC, expression rate, and onset time.";
}

export type PanelCursor = {
  fileIndex: number;
  panelIndex: number;
};

export type SlideChannelLabels = Record<number, string>;

const MAX_TIMESERIES_TRACES = 64;
const MAX_POINTS_PER_TRACE = 400;

function resultFileRank(file: StudioAnalysisCsvFile): number {
  if (file.kind === "timeseries") return 0;
  if (file.fileName === "kill_curve.csv") return 1;
  if (file.fileName === "death_times.csv") return 2;
  if (file.fileName === "auc.csv") return 3;
  if (file.fileName === "fit.csv") return 4;
  if (file.fileName === "predictions_cleaned.csv") return 5;
  return 6;
}

function parseTimeseriesGroupKey(pos: number | null, roi: number | null): string {
  const safePos = pos === null ? "pos:?" : `pos:${pos}`;
  const safeRoi = roi === null ? "roi:?" : `roi:${roi}`;
  return `${safePos}|${safeRoi}`;
}

function timeseriesTraceLabel(pos: number | null, roi: number | null): string {
  const posLabel = pos === null ? "Pos?" : `Pos${pos}`;
  const roiLabel = roi === null ? "ROI ?" : `ROI ${roi}`;
  return `${posLabel} ${roiLabel}`;
}

export function sortResultFiles(files: StudioAnalysisCsvFile[]): StudioAnalysisCsvFile[] {
  return [...files].toSorted((left, right) => {
    const leftRank = resultFileRank(left);
    const rightRank = resultFileRank(right);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.fileName.localeCompare(right.fileName);
  });
}

/** Parse `Pos{n}/ch{n}.csv` (or legacy `sc{S}_ch{C}.csv`) display path. */
export function parseTimeseriesPath(fileName: string): { pos: number; channel: number } | null {
  const normalized = fileName.replace(/\\/g, "/");
  const posCh = /(?:^|\/)Pos(\d+)\/ch(\d+)\.csv$/i.exec(normalized);
  if (posCh) {
    return { pos: Number(posCh[1]), channel: Number(posCh[2]) };
  }
  const legacy = /^sc(\d+)_ch(\d+)$/i.exec(normalized.replace(/\.csv$/i, ""));
  if (legacy) {
    return { pos: -1, channel: Number(legacy[2]) };
  }
  return null;
}

/**
 * Resolve slide channel for a timeseries file.
 * Prefer `slide` / `slide_channel` in CSV rows; otherwise map `Pos{n}/ch{n}` via assay labels is not available here —
 * titles fall back to the path stem. Legacy `sc{S}_ch{C}` stems still encode slide channel.
 */
export function parseSlideChannelFromFileName(fileName: string): number | null {
  const normalized = fileName.replace(/\.csv$/i, "").replace(/\\/g, "/");
  const legacy = /^sc(\d+)_ch\d+$/i.exec(normalized);
  if (legacy) return Number(legacy[1]);
  return null;
}

export function boxplotXAxisLabel(slideChannelLabels: SlideChannelLabels): string {
  return Object.keys(slideChannelLabels).length > 0 ? "sample" : "slide channel";
}

export function formatSampleLabel(
  slideChannel: number,
  slideChannelLabels: SlideChannelLabels,
): string {
  return slideChannelLabels[slideChannel]?.trim() || String(slideChannel);
}

export function formatSlideChannelTickLabel(
  slideChannel: number,
  count: number,
  slideChannelLabels: SlideChannelLabels,
): string {
  return `${formatSampleLabel(slideChannel, slideChannelLabels)} (n=${count})`;
}

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function downsamplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % step === 0);
}

function parseCsvContent(content: string): string[][] {
  return content
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((value) => value.trim()))
    .map((row) => (row.every((value) => value === "") ? [] : row))
    .filter((row) => row.length > 0);
}

export function parseCsvFile(file: {
  kind: string;
  fileName: string;
  path: string;
  csv: string;
}): ParsedCsvFile | null {
  const lines = parseCsvContent(file.csv);
  if (lines.length === 0) return null;
  const headers = lines[0];
  if (headers.length === 0) return null;
  return {
    kind: file.kind,
    fileName: file.fileName,
    path: file.path,
    headers,
    rows: lines.slice(1),
  };
}

function parseNumeric(raw: string): number | null {
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
}

function quantile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * percentile;
  const base = Math.floor(position);
  const remainder = position - base;
  const next = sorted[base + 1];
  if (next === undefined) return sorted[base];
  return sorted[base] + remainder * (next - sorted[base]);
}

export function computeBoxStats(values: number[]): BoxPlotStats {
  const sorted = [...values].toSorted((left, right) => left - right);
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}

function headerIndex(headers: string[], name: string) {
  return headers.indexOf(name);
}

/** Rust writes `slide`; older fixtures used `slide_channel`. Accept both. */
function slideChannelHeaderIndex(headers: string[]): number {
  const slide = headerIndex(headers, "slide");
  if (slide >= 0) return slide;
  return headerIndex(headers, "slide_channel");
}

function fitParameterValue(
  row: string[],
  headers: string[],
  parameter: (typeof PLOTTED_FIT_PARAMETERS)[number][0],
): number | null {
  const read = (name: string) => parseNumeric(row[headerIndex(headers, name)] ?? "");
  const proteinDecayRate = read("protein_decay_rate");
  const mrnaDecayRate = read("mrna_decay_rate");
  const expressionAmplitude = read("expression_amplitude");

  switch (parameter) {
    case "baseline_intensity":
    case "onset_time":
      return read(parameter);
    case "protein_lifetime":
      return read("protein_lifetime") ?? (proteinDecayRate ? 1 / proteinDecayRate : null);
    case "mrna_lifetime":
      return read("mrna_lifetime") ?? (mrnaDecayRate ? 1 / mrnaDecayRate : null);
    case "expression_rate": {
      const direct = read("expression_rate");
      if (direct !== null) return direct;
      if (expressionAmplitude === null || mrnaDecayRate === null || proteinDecayRate === null) {
        return null;
      }
      return expressionAmplitude * (mrnaDecayRate - proteinDecayRate);
    }
    default:
      return null;
  }
}

function buildBoxPlotGroups(
  rows: string[][],
  slideChannelIndex: number,
  readValue: (row: string[]) => number | null,
  slideChannelLabels: SlideChannelLabels,
  valueFilter?: (value: number) => boolean,
): BoxPlotGroup[] {
  const grouped = new Map<number, number[]>();

  for (const row of rows) {
    const slideChannel = parseNumeric(row[slideChannelIndex]);
    const value = readValue(row);
    if (slideChannel === null || value === null || !Number.isInteger(slideChannel)) continue;
    if (valueFilter && !valueFilter(value)) continue;
    const bucket = grouped.get(slideChannel) ?? [];
    bucket.push(value);
    grouped.set(slideChannel, bucket);
  }

  return Array.from(grouped.entries())
    .toSorted(([left], [right]) => left - right)
    .map(([slideChannel, values]) => ({
      slideChannel,
      label: formatSlideChannelTickLabel(slideChannel, values.length, slideChannelLabels),
      values,
      stats: computeBoxStats(values),
    }));
}

function timeseriesPanelTitle(
  file: ParsedCsvFile,
  traceCount: number,
  renderedTraceCount: number,
  slideChannelLabels: SlideChannelLabels,
): string {
  const slideChannel = parseSlideChannelFromFileName(file.fileName);
  const pathParts = parseTimeseriesPath(file.fileName);
  let label: string;
  if (slideChannel !== null && slideChannelLabels[slideChannel]?.trim()) {
    label = slideChannelLabels[slideChannel].trim();
  } else if (slideChannel !== null) {
    label = `slide channel ${slideChannel}`;
  } else if (pathParts) {
    label = `Pos${pathParts.pos} ch${pathParts.channel}`;
  } else {
    label = file.fileName.replace(/\.csv$/i, "");
  }

  const traceLabel =
    renderedTraceCount < traceCount
      ? `${renderedTraceCount} of ${traceCount} traces`
      : `${traceCount} traces`;
  return `${label} (${traceLabel})`;
}

export function parsePanelGroups(
  file: ParsedCsvFile,
  timeseriesXScale: number,
  slideChannelLabels: SlideChannelLabels,
): ResultPanel[] {
  const headers = file.headers;
  const rows = file.rows;
  const headerMap = Object.fromEntries(headers.map((header, index) => [header, index]));
  const tIndex = headerMap.t ?? -1;
  const correctedIndex = headerMap.corrected ?? -1;
  const pDeadIndex = headerMap.p_dead ?? -1;
  const areaIndex = headerMap.area ?? -1;
  const posIndex = headerMap.pos ?? -1;
  const roiIndex = headerMap.roi ?? -1;
  const slideChannelIndex = slideChannelHeaderIndex(headers);
  const aucIndex = headerIndex(headers, "auc");
  const inferredPos = parseTimeseriesPath(file.fileName)?.pos ?? null;

  const resultPanels: ResultPanel[] = [];

  const makeTimeseriesPanel = (metricIndex: number, metric: "corrected" | "area" | "p_dead") => {
    if (tIndex < 0 || metricIndex < 0) return;
    const traces = new Map<string, TimeseriesTrace>();

    for (const row of rows) {
      const rawX = row[tIndex];
      const rawY = row[metricIndex];
      if (!rawX || !rawY) continue;

      const x = parseNumeric(rawX);
      const y = parseNumeric(rawY);
      if (x === null || y === null) continue;

      const pos = posIndex >= 0 ? parseNumeric(row[posIndex]) : inferredPos;
      const roi = roiIndex >= 0 ? parseNumeric(row[roiIndex]) : null;
      if (pos !== null && !Number.isInteger(pos)) continue;
      if (roi !== null && !Number.isInteger(roi)) continue;

      const key = parseTimeseriesGroupKey(pos, roi);
      const trace = traces.get(key);
      if (trace) {
        trace.points.push({ x: x * timeseriesXScale, y });
        continue;
      }
      traces.set(key, {
        key,
        label: timeseriesTraceLabel(pos, roi),
        points: [{ x: x * timeseriesXScale, y }],
      });
    }

    const traceCount = traces.size;
    const grouped = Array.from(traces.values())
      .map((trace) => ({
        key: trace.key,
        label: trace.label,
        points: downsamplePoints(
          trace.points.toSorted((left, right) => left.x - right.x),
          MAX_POINTS_PER_TRACE,
        ),
      }))
      .slice(0, MAX_TIMESERIES_TRACES);
    if (grouped.length === 0) return;

    resultPanels.push({
      kind: "timeseries",
      title: timeseriesPanelTitle(file, traceCount, grouped.length, slideChannelLabels),
      fileName: file.fileName,
      path: file.path,
      xAxisLabel: "minutes",
      yAxisLabel:
        metric === "corrected" ? "intensity" : metric === "area" ? "mask area" : "P(dead)",
      traces: grouped,
    });
  };

  const nAliveIndex = headerIndex(headers, "n_alive");
  const deathTimeIndex = headerIndex(headers, "death_time");

  if (tIndex >= 0 && nAliveIndex >= 0) {
    const grouped = new Map<number, Array<{ x: number; y: number }>>();
    for (const row of rows) {
      const t = parseNumeric(row[tIndex] ?? "");
      const nAlive = parseNumeric(row[nAliveIndex] ?? "");
      if (t === null || nAlive === null) continue;
      const slideChannel = slideChannelIndex >= 0 ? parseNumeric(row[slideChannelIndex] ?? "") : 0;
      if (slideChannel === null || !Number.isInteger(slideChannel)) continue;
      const bucket = grouped.get(slideChannel) ?? [];
      bucket.push({ x: t * timeseriesXScale, y: nAlive });
      grouped.set(slideChannel, bucket);
    }

    const series = Array.from(grouped.entries())
      .toSorted(([left], [right]) => left - right)
      .flatMap(([slideChannel, points]) => {
        if (points.length === 0) return [];
        const label = formatSampleLabel(slideChannel, slideChannelLabels);
        return [
          {
            dataKey: `kill_curve_${slideChannel}`,
            label,
            points: downsamplePoints(
              points.toSorted((left, right) => left.x - right.x),
              MAX_POINTS_PER_TRACE,
            ),
          },
        ];
      });
    if (series.length > 0) {
      resultPanels.push({
        kind: "generic",
        title: "N(alive)",
        fileName: file.fileName,
        path: file.path,
        xAxisLabel: "minutes",
        yAxisLabel: "N(alive)",
        series,
      });
      return resultPanels;
    }
  }

  if (deathTimeIndex >= 0) {
    const grouped = new Map<number, number[]>();
    for (const row of rows) {
      const deathTime = parseNumeric(row[deathTimeIndex] ?? "");
      if (deathTime === null || deathTime <= 0) continue;
      const slideChannel = slideChannelIndex >= 0 ? parseNumeric(row[slideChannelIndex] ?? "") : 0;
      if (slideChannel === null || !Number.isInteger(slideChannel)) continue;
      const bucket = grouped.get(slideChannel) ?? [];
      bucket.push(deathTime * timeseriesXScale);
      grouped.set(slideChannel, bucket);
    }

    for (const [slideChannel, values] of Array.from(grouped.entries()).toSorted(
      ([left], [right]) => left - right,
    )) {
      if (values.length === 0) continue;
      const label = formatSlideChannelTickLabel(slideChannel, values.length, slideChannelLabels);
      resultPanels.push({
        kind: "histogram",
        title: `T_death · ${label}`,
        fileName: file.fileName,
        path: file.path,
        xAxisLabel: "minutes",
        yAxisLabel: "n crops",
        values,
      });
    }
    if (resultPanels.length > 0) return resultPanels;
  }

  if (tIndex >= 0 && (correctedIndex >= 0 || areaIndex >= 0 || pDeadIndex >= 0)) {
    if (correctedIndex >= 0) makeTimeseriesPanel(correctedIndex, "corrected");
    if (areaIndex >= 0) makeTimeseriesPanel(areaIndex, "area");
    if (pDeadIndex >= 0) makeTimeseriesPanel(pDeadIndex, "p_dead");
    if (resultPanels.length > 0) return resultPanels;
  }

  if (slideChannelIndex >= 0 && aucIndex >= 0) {
    const groups = buildBoxPlotGroups(
      rows,
      slideChannelIndex,
      (row) => parseNumeric(row[aucIndex] ?? ""),
      slideChannelLabels,
      (value) => value > 0,
    );
    if (groups.length > 0) {
      resultPanels.push({
        kind: "boxplot",
        title: "AUC",
        fileName: file.fileName,
        path: file.path,
        xAxisLabel: boxplotXAxisLabel(slideChannelLabels),
        yAxisLabel: "AUC",
        groups,
      });
      return resultPanels;
    }
  }

  if (
    headerIndex(headers, "protein_decay_rate") >= 0 &&
    headerIndex(headers, "onset_time") >= 0 &&
    slideChannelIndex >= 0
  ) {
    for (const [parameter, label] of PLOTTED_FIT_PARAMETERS) {
      const useLogScale = parameter === "expression_rate";
      const groups = buildBoxPlotGroups(
        rows,
        slideChannelIndex,
        (row) => fitParameterValue(row, headers, parameter),
        slideChannelLabels,
        useLogScale ? (value) => value > 0 : undefined,
      );
      if (groups.length === 0) continue;

      resultPanels.push({
        kind: "boxplot",
        title: label,
        fileName: file.fileName,
        path: file.path,
        xAxisLabel: boxplotXAxisLabel(slideChannelLabels),
        yAxisLabel: label,
        groups,
        yScale: useLogScale ? "log" : undefined,
      });
    }

    if (resultPanels.length > 0) return resultPanels;
  }

  if (headers.length < 2) return resultPanels;
  const xIndex = 0;
  const yIndexes = headers.slice(1);
  const series = yIndexes
    .map((columnLabel, sourceIndex) => {
      const dataKey = `series_${sourceIndex}`;
      const points = rows
        .map((row) => {
          const rawX = row[xIndex];
          const rawY = row[sourceIndex + 1];
          if (!rawX || !rawY) return null;
          const x = parseNumeric(rawX);
          const y = parseNumeric(rawY);
          if (x === null || y === null) return null;
          return { x, y };
        })
        .filter((point): point is { x: number; y: number } => point !== null);
      return { dataKey, label: columnLabel, points };
    })
    .filter((entry) => entry.points.length > 0);
  if (series.length > 0) {
    resultPanels.push({
      kind: "generic",
      title: file.fileName,
      fileName: file.fileName,
      path: file.path,
      xAxisLabel: headers[0],
      yAxisLabel: "values",
      series,
    });
  }

  return resultPanels;
}

export type ResultPlotSection = "timeseries" | "parameters";

export function resultPlotSection(file: StudioAnalysisCsvFile): ResultPlotSection {
  if (file.kind === "timeseries") return "timeseries";
  return "parameters";
}

export function filterResultFilesBySection(
  files: StudioAnalysisCsvFile[],
  section: ResultPlotSection,
): StudioAnalysisCsvFile[] {
  return sortResultFiles(files).filter((file) => resultPlotSection(file) === section);
}

export function defaultResultPlotSection(files: StudioAnalysisCsvFile[]): ResultPlotSection {
  const sorted = sortResultFiles(files);
  if (sorted.some((file) => resultPlotSection(file) === "timeseries")) return "timeseries";
  return "parameters";
}

export function resolveCachedPanelByCursor(
  files: StudioAnalysisCsvFile[],
  cursor: PanelCursor,
  getPanels: (file: StudioAnalysisCsvFile) => ResultPanel[] | undefined,
): { panel: ResultPanel; nextCursor: PanelCursor | null } | null {
  for (let fileIndex = Math.max(cursor.fileIndex, 0); fileIndex < files.length; fileIndex++) {
    const panels = getPanels(files[fileIndex]);
    if (panels === undefined) return null;
    if (panels.length === 0) continue;

    const panelIndex = fileIndex === cursor.fileIndex ? Math.max(cursor.panelIndex, 0) : 0;
    if (panelIndex >= panels.length) continue;

    const panel = panels[panelIndex];
    let nextCursor: PanelCursor | null = null;

    if (panelIndex + 1 < panels.length) {
      nextCursor = { fileIndex, panelIndex: panelIndex + 1 };
    } else if (fileIndex + 1 < files.length) {
      nextCursor = { fileIndex: fileIndex + 1, panelIndex: 0 };
    }

    return { panel, nextCursor };
  }

  return null;
}

export async function resolvePanelByCursor(
  files: StudioAnalysisCsvFile[],
  cursor: PanelCursor,
  loadPanels: (file: StudioAnalysisCsvFile) => Promise<ResultPanel[]>,
): Promise<{ panel: ResultPanel; nextCursor: PanelCursor | null } | null> {
  const fileIndex = Math.max(cursor.fileIndex, 0);
  if (fileIndex >= files.length) return null;

  const panels = await loadPanels(files[fileIndex]);
  if (panels.length === 0) {
    return resolvePanelByCursor(files, { fileIndex: fileIndex + 1, panelIndex: 0 }, loadPanels);
  }

  const panelIndex = fileIndex === cursor.fileIndex ? Math.max(cursor.panelIndex, 0) : 0;
  if (panelIndex >= panels.length) {
    return resolvePanelByCursor(files, { fileIndex: fileIndex + 1, panelIndex: 0 }, loadPanels);
  }

  const panel = panels[panelIndex];
  let nextCursor: PanelCursor | null = null;

  if (panelIndex + 1 < panels.length) {
    nextCursor = { fileIndex, panelIndex: panelIndex + 1 };
  } else if (fileIndex + 1 < files.length) {
    nextCursor = { fileIndex: fileIndex + 1, panelIndex: 0 };
  }

  return { panel, nextCursor };
}

export function intervalFromAssaySettings(
  timelapseAmount: number | null,
  timelapseUnit: "second" | "minute" | "hour",
) {
  if (timelapseAmount == null || timelapseAmount <= 0) return 1;
  switch (timelapseUnit) {
    case "second":
      return timelapseAmount / 60;
    case "hour":
      return timelapseAmount * 60;
    case "minute":
    default:
      return timelapseAmount;
  }
}
