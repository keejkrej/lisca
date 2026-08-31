import { KILLING_PLOTS, type KillingPlotSpec } from "../assays/killing/catalog";
import { TRANSFECTION_PLOTS, type TransfectionPlotSpec } from "../assays/transfection/catalog";

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
  "auc.png",
  "traces_fit.png",
  "mrna_lifetime.png",
  "expression_rate.png",
  "onset_time.png",
  "baseline_intensity.png",
  "protein_lifetime.png",
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
      ? "Death-probability traces (P(dead)) for each sample."
      : "Intensity, area, and fitted traces for each sample.";
  }
  return assay === "killing"
    ? "Survival curve and death-time distributions."
    : "Fitted parameters: mRNA lifetime, AUC, expression rate, and onset time.";
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

/** `results/<sample>/<file>.png` → sample folder; root plots under `results/` have none. */
export function sampleFolderFromResultPath(path: string): string | undefined {
  const parts = path
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part.length > 0);
  const resultsIdx = parts.lastIndexOf("results");
  if (resultsIdx === -1) return undefined;
  if (resultsIdx === parts.length - 3) {
    return parts[resultsIdx + 1];
  }
  return undefined;
}

function titledPlot(baseTitle: string, path: string): string {
  const sample = sampleFolderFromResultPath(path);
  return sample ? `${baseTitle} (${sample})` : baseTitle;
}

function comparePlotFiles(left: ResultFileRef, right: ResultFileRef): number {
  const leftSample = sampleFolderFromResultPath(left.path) ?? "";
  const rightSample = sampleFolderFromResultPath(right.path) ?? "";
  return leftSample.localeCompare(rightSample) || left.path.localeCompare(right.path);
}

export function collectResultPlots(
  files: ResultFileRef[],
  assay: ResultAssayKind = inferResultAssayKind(files),
): ResultPlot[] {
  const pngs = files.filter(isPlotFile);
  const ordered: ResultPlot[] = [];
  const seen = new Set<string>();

  for (const spec of catalogForAssay(assay)) {
    const matches = pngs
      .filter((file) => file.fileName === spec.fileName && !seen.has(file.path))
      .toSorted(comparePlotFiles);
    for (const file of matches) {
      ordered.push({
        fileName: file.fileName,
        path: file.path,
        title: titledPlot(spec.title, file.path),
        section: spec.section,
      });
      seen.add(file.path);
    }
  }

  const leftovers = pngs.filter((file) => !seen.has(file.path)).toSorted(comparePlotFiles);
  for (const file of leftovers) {
    ordered.push({
      fileName: file.fileName,
      path: file.path,
      title: titledPlot(titleFromFileName(file.fileName), file.path),
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
