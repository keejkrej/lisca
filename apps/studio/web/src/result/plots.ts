import type { StudioAnalysisCsvFile } from "@lisca/contracts";

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
};

export type ResultPanel = TimeseriesPanel | BoxPlotPanel | GenericLinePanel | HistogramPanel;

/** Summary parameter plots shown on the Parameters tab, in display order. */
export const DISPLAYED_PARAMETER_PLOTS = [
  { id: "mrna_lifetime", label: "mRNA lifetime" },
  { id: "auc", label: "AUC" },
  { id: "transfection_efficiency", label: "transfection efficiency" },
  { id: "translation_onset", label: "translation onset" },
] as const;

/** PNG filenames under workspace/results/, matching transfection plot output. */
export const TIMESERIES_RESULT_PLOT_FILES = {
  corrected: "traces.png",
  correctedSharedY: "traces_shared_y.png",
  area: "area.png",
  areaSharedY: "area_shared_y.png",
} as const;

/** PNG filenames for immune killing assay results. */
export const IMMUNE_KILLING_RESULT_PLOT_FILES = {
  killCurve: "kill_curve.png",
} as const;

export type DisplayedParameterPlotId = (typeof DISPLAYED_PARAMETER_PLOTS)[number]["id"];

export function displayedParameterPlotFileName(id: DisplayedParameterPlotId): string {
  return `${id}.png`;
}

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

export function collectTimeseriesPanels(panelsByFile: ResultPanel[][]): TimeseriesPanel[] {
  return panelsByFile.flatMap((panels) =>
    panels.filter((panel): panel is TimeseriesPanel => panel.kind === "timeseries"),
  );
}

export type PanelCursor = {
  fileIndex: number;
  panelIndex: number;
};

export type SlideChannelLabels = Record<number, string>;

/** Matches transfection.commands.plot_fit.PLOTTED_PARAMETERS */
export const PLOTTED_FIT_PARAMETERS = [
  ["intensity_offset", "intensity offset"],
  ["protein_lifetime", "protein lifetime"],
  ["mrna_lifetime", "mRNA lifetime"],
  ["translation_onset", "translation onset"],
  ["transfection_efficiency", "transfection efficiency"],
] as const;

const MAX_TIMESERIES_TRACES = 64;
const MAX_POINTS_PER_TRACE = 400;

function resultFileRank(file: StudioAnalysisCsvFile): number {
  if (file.kind === "timeseries") return 0;
  if (file.fileName === "kill_curve.csv") return 0;
  if (file.fileName === "auc.csv") return 1;
  if (file.fileName === "fit.csv") return 2;
  if (file.fileName === "death_times.csv") return 3;
  if (file.fileName === "predictions_cleaned.csv") return 4;
  return 5;
}

function parseTimeseriesGroupKey(pos: number | null, roi: number | null): string {
  const safePos = pos === null ? "pos:?" : `pos:${pos}`;
  const safeRoi = roi === null ? "roi:?" : `roi:${roi}`;
  return `${safePos}|${safeRoi}`;
}

export function sortResultFiles(files: StudioAnalysisCsvFile[]): StudioAnalysisCsvFile[] {
  return [...files].toSorted((left, right) => {
    const leftRank = resultFileRank(left);
    const rightRank = resultFileRank(right);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.fileName.localeCompare(right.fileName);
  });
}

export function parseSlideChannelFromFileName(fileName: string): number | null {
  const match = /^sc(\d+)_ch\d+$/i.exec(fileName.replace(/\.csv$/i, ""));
  return match ? Number(match[1]) : null;
}

export function boxplotXAxisLabel(slideChannelLabels: SlideChannelLabels): string {
  return Object.keys(slideChannelLabels).length > 0 ? "condition" : "slide channel";
}

export function formatSlideChannelTickLabel(
  slideChannel: number,
  count: number,
  slideChannelLabels: SlideChannelLabels,
): string {
  const name = slideChannelLabels[slideChannel]?.trim() || String(slideChannel);
  return `${name} (n=${count})`;
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
    case "intensity_offset":
    case "translation_onset":
      return read(parameter);
    case "protein_lifetime":
      return read("protein_lifetime") ?? (proteinDecayRate ? 1 / proteinDecayRate : null);
    case "mrna_lifetime":
      return read("mrna_lifetime") ?? (mrnaDecayRate ? 1 / mrnaDecayRate : null);
    case "transfection_efficiency": {
      const direct = read("transfection_efficiency");
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
  let label: string;
  if (slideChannel !== null && slideChannelLabels[slideChannel]?.trim()) {
    label = slideChannelLabels[slideChannel].trim();
  } else if (slideChannel !== null) {
    label = `slide channel ${slideChannel}`;
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
  const areaIndex = headerMap.area ?? -1;
  const posIndex = headerMap.pos ?? -1;
  const roiIndex = headerMap.roi ?? -1;
  const slideChannelIndex = headerIndex(headers, "slide_channel");
  const aucIndex = headerIndex(headers, "auc");

  const resultPanels: ResultPanel[] = [];

  const makeTimeseriesPanel = (metricIndex: number, metric: "corrected" | "area") => {
    if (tIndex < 0 || metricIndex < 0) return;
    const traces = new Map<string, TimeseriesTrace>();

    for (const row of rows) {
      const rawX = row[tIndex];
      const rawY = row[metricIndex];
      if (!rawX || !rawY) continue;

      const x = parseNumeric(rawX);
      const y = parseNumeric(rawY);
      if (x === null || y === null) continue;

      const pos = posIndex >= 0 ? parseNumeric(row[posIndex]) : null;
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
        label: key,
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
      yAxisLabel: metric === "corrected" ? "corrected intensity" : "mask area",
      traces: grouped,
    });
  };

  const nAliveIndex = headerIndex(headers, "n_alive");
  const deathTimeIndex = headerIndex(headers, "death_time");
  const slideChannelForKillIndex = headerIndex(headers, "slide_channel");

  if (tIndex >= 0 && nAliveIndex >= 0) {
    const grouped = new Map<number, Array<{ x: number; y: number }>>();
    for (const row of rows) {
      const t = parseNumeric(row[tIndex] ?? "");
      const nAlive = parseNumeric(row[nAliveIndex] ?? "");
      if (t === null || nAlive === null) continue;
      const slideChannel =
        slideChannelForKillIndex >= 0 ? parseNumeric(row[slideChannelForKillIndex] ?? "") : 0;
      if (slideChannel === null || !Number.isInteger(slideChannel)) continue;
      const bucket = grouped.get(slideChannel) ?? [];
      bucket.push({ x: t * timeseriesXScale, y: nAlive });
      grouped.set(slideChannel, bucket);
    }

    for (const [slideChannel, points] of Array.from(grouped.entries()).toSorted(
      ([left], [right]) => left - right,
    )) {
      if (points.length === 0) continue;
      const label = formatSlideChannelTickLabel(slideChannel, points.length, slideChannelLabels);
      resultPanels.push({
        kind: "generic",
        title: `Kill curve (${label})`,
        fileName: file.fileName,
        path: file.path,
        xAxisLabel: "minutes",
        yAxisLabel: "n alive",
        series: [
          {
            dataKey: `kill_curve_${slideChannel}`,
            label,
            points: downsamplePoints(
              points.toSorted((left, right) => left.x - right.x),
              MAX_POINTS_PER_TRACE,
            ),
          },
        ],
      });
    }
    if (resultPanels.length > 0) return resultPanels;
  }

  if (deathTimeIndex >= 0) {
    const values: number[] = [];
    for (const row of rows) {
      const deathTime = parseNumeric(row[deathTimeIndex] ?? "");
      if (deathTime === null || deathTime <= 0) continue;
      if (slideChannelForKillIndex >= 0) {
        const slideChannel = parseNumeric(row[slideChannelForKillIndex] ?? "");
        if (slideChannel === null || !Number.isInteger(slideChannel)) continue;
      }
      values.push(deathTime * timeseriesXScale);
    }
    if (values.length > 0) {
      resultPanels.push({
        kind: "histogram",
        title: `${file.fileName}: death time distribution`,
        fileName: file.fileName,
        path: file.path,
        xAxisLabel: "minutes",
        yAxisLabel: "n crops",
        values,
      });
      return resultPanels;
    }
  }

  if (tIndex >= 0 && (correctedIndex >= 0 || areaIndex >= 0)) {
    if (correctedIndex >= 0) makeTimeseriesPanel(correctedIndex, "corrected");
    if (areaIndex >= 0) makeTimeseriesPanel(areaIndex, "area");
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
        title: `${file.fileName}: AUC`,
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
    headerIndex(headers, "translation_onset") >= 0 &&
    slideChannelIndex >= 0
  ) {
    for (const [parameter, label] of PLOTTED_FIT_PARAMETERS) {
      const useLogScale = parameter === "transfection_efficiency";
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
        title: `${file.fileName}: ${label}`,
        fileName: file.fileName,
        path: file.path,
        xAxisLabel: boxplotXAxisLabel(slideChannelLabels),
        yAxisLabel: label,
        groups,
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
  if (file.kind === "timeseries" || file.fileName === "kill_curve.csv") {
    return "timeseries";
  }
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
    return resolvePanelByCursor(
      files,
      { fileIndex: fileIndex + 1, panelIndex: 0 },
      loadPanels,
    );
  }

  const panelIndex = fileIndex === cursor.fileIndex ? Math.max(cursor.panelIndex, 0) : 0;
  if (panelIndex >= panels.length) {
    return resolvePanelByCursor(
      files,
      { fileIndex: fileIndex + 1, panelIndex: 0 },
      loadPanels,
    );
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
