import { KILLING_PLOTS, type KillingPlotSpec } from "../assays/killing/catalog";
import {
  TRANSFECTION_PLOTS,
  type TransfectionPlotSpec,
} from "../assays/transfection/catalog";

export type ResultPlotSection = "timeseries" | "parameters";

export type ResultAssayKind = "transfection" | "killing" | "unknown";

export type ResultPlotSpec = TransfectionPlotSpec | KillingPlotSpec;

export type ResultPlot = {
  fileName: string;
  path: string;
  title: string;
  section: ResultPlotSection;
  /** Data URL or HTTP URL. Fixtures set this; Studio fills it from the file server. */
  src?: string;
};

export type ResultFileRef = {
  kind?: string;
  fileName: string;
  path: string;
};

const KILLING_MARKERS = new Set([
  "kill_curve.csv",
  "kill_curve.png",
  "death_times.csv",
  "death_times.png",
]);

const TRANSFECTION_MARKERS = new Set([
  "auc.csv",
  "auc.png",
  "auc_log.png",
  "fit.csv",
  "traces_fit.png",
  "mrna_lifetime.png",
  "expression_rate.png",
  "onset_time.png",
]);

export function isPlotFile(file: ResultFileRef): boolean {
  return file.kind === "plot" || file.fileName.toLowerCase().endsWith(".png");
}

export function inferResultAssayKind(files: ResultFileRef[]): ResultAssayKind {
  if (files.some((file) => KILLING_MARKERS.has(file.fileName))) return "killing";
  if (files.some((file) => TRANSFECTION_MARKERS.has(file.fileName))) return "transfection";
  return "unknown";
}

export function catalogForAssay(assay: ResultAssayKind): readonly ResultPlotSpec[] {
  if (assay === "killing") return KILLING_PLOTS;
  return TRANSFECTION_PLOTS;
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
      ? "P(dead) traces written by the Rust pipeline."
      : "Intensity, area, and fit-trace plots written by the Rust pipeline.";
  }
  return assay === "killing"
    ? "Kill-curve and death-time plots written by the Rust pipeline."
    : "Parameter boxplots written by the Rust pipeline: mRNA lifetime, AUC, expression rate, and onset time.";
}

function guessPlotSection(fileName: string): ResultPlotSection {
  const stem = fileName.replace(/\.png$/i, "");
  if (
    stem.startsWith("traces") ||
    stem.startsWith("area") ||
    stem === "traces_fit" ||
    stem === "traces_fit_shared_y"
  ) {
    return "timeseries";
  }
  return "parameters";
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.png$/i, "").replaceAll("_", " ");
}

export function collectResultPlots(
  files: ResultFileRef[],
  assay: ResultAssayKind = inferResultAssayKind(files),
): ResultPlot[] {
  const pngs = files.filter(isPlotFile);
  const byName = new Map(pngs.map((file) => [file.fileName, file]));
  const ordered: ResultPlot[] = [];
  const seen = new Set<string>();

  for (const spec of catalogForAssay(assay)) {
    const file = byName.get(spec.fileName);
    if (!file) continue;
    ordered.push({
      fileName: file.fileName,
      path: file.path,
      title: spec.title,
      section: spec.section,
    });
    seen.add(file.fileName);
  }

  const leftovers = pngs
    .filter((file) => !seen.has(file.fileName))
    .toSorted((left, right) => left.fileName.localeCompare(right.fileName));
  for (const file of leftovers) {
    ordered.push({
      fileName: file.fileName,
      path: file.path,
      title: titleFromFileName(file.fileName),
      section: guessPlotSection(file.fileName),
    });
  }
  return ordered;
}

export function filterResultPlotsBySection(
  plots: ResultPlot[],
  section: ResultPlotSection,
): ResultPlot[] {
  return plots.filter((plot) => plot.section === section);
}

export function defaultResultPlotSection(plots: ResultPlot[]): ResultPlotSection {
  if (plots.some((plot) => plot.section === "timeseries")) return "timeseries";
  return "parameters";
}

export function resultFileUrl(httpBaseUrl: string, path: string): string {
  const base = httpBaseUrl.replace(/\/$/, "");
  return `${base}/fs/file?path=${encodeURIComponent(path)}`;
}

export function withPlotSrc(plot: ResultPlot, httpBaseUrl: string): ResultPlot {
  if (plot.src) return plot;
  return { ...plot, src: resultFileUrl(httpBaseUrl, plot.path) };
}
