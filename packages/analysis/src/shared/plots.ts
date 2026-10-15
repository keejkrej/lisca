import { BINDING_PLOTS, type BindingPlotSpec } from "../assays/binding/catalog";
import { ENGAGEMENT_PLOTS, KILLING_PLOTS, type KillingPlotSpec } from "../assays/killing/catalog";
import { TRANSFECTION_PLOTS, type TransfectionPlotSpec } from "../assays/transfection/catalog";
import { RESULT_PLOT_SECTIONS, type ResultPlotSection } from "./sections";

export { RESULT_PLOT_SECTIONS, type ResultPlotSection };

export type ResultAssayKind =
  | "transfection"
  | "killing-death-reporter"
  | "killing-engagement"
  | "lnp-binding"
  | "unknown";

export type ResultPlotSpec = TransfectionPlotSpec | KillingPlotSpec | BindingPlotSpec;

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

const BINDING_MARKERS = new Set([
  ...BINDING_PLOTS.map((plot) => plot.fileName),
  "particles.csv",
  "binding.csv",
  "binding_summary.csv",
]);

const ENGAGEMENT_MARKERS = new Set([
  "engagement_traces.png",
  "engagement_traces_shared_y.png",
  "engagement_traces_summary.png",
  "engagement_traces_summary_shared_y.png",
  "engagement_counts.csv",
  "engagement_summary.csv",
]);

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
  if (files.some((file) => BINDING_MARKERS.has(file.fileName))) return "lnp-binding";
  if (files.some((file) => ENGAGEMENT_MARKERS.has(file.fileName))) return "killing-engagement";
  if (files.some((file) => KILLING_MARKERS.has(file.fileName))) return "killing-death-reporter";
  if (files.some((file) => TRANSFECTION_MARKERS.has(file.fileName))) return "transfection";
  return "unknown";
}

export function catalogForAssay(assay: ResultAssayKind): readonly ResultPlotSpec[] {
  if (assay === "lnp-binding") return BINDING_PLOTS;
  if (assay === "killing-engagement") return ENGAGEMENT_PLOTS;
  if (assay === "killing-death-reporter") return KILLING_PLOTS;
  return TRANSFECTION_PLOTS;
}

const SECTION_LABEL: Record<ResultPlotSection, string> = {
  traces: "Traces",
  "traces-summary": "Traces summary",
  area: "Mask area",
  "traces-fit": "Traces fit",
  auc: "AUC",
  parameters: "Parameters",
  "parameters-comparison": "Parameters comparison",
};

export function resultSectionLabel(section: ResultPlotSection): string {
  return SECTION_LABEL[section];
}

export function resultSectionInstruction(
  section: ResultPlotSection,
  assay: ResultAssayKind,
): string {
  if (section === "traces") {
    if (assay === "lnp-binding") {
      return "Particle count, intensity (mean, median, IQR), and radius (mean, median, IQR) for each cell. Shared y uses one scale across samples.";
    }
    if (assay === "killing-engagement") {
      return "Engager count for each cell. Shared y uses one scale across samples.";
    }
    return assay === "killing-death-reporter"
      ? "Fluorescence for each cell. Shared y uses one scale across samples."
      : "Intensity for each cell. Shared y uses one scale across samples.";
  }
  if (section === "traces-summary") {
    if (assay === "lnp-binding") {
      return "Mean, median, and interquartile range of particle count, intensity, and radius for each sample.";
    }
    if (assay === "killing-engagement") {
      return "Mean, median, and interquartile range of engager counts for each sample.";
    }
    return assay === "killing-death-reporter"
      ? "Mean, median, and interquartile range of fluorescence for each sample."
      : "Mean, median, and interquartile range of intensity for each sample.";
  }
  if (section === "area") {
    return "Mask area for each cell. Shared y uses one scale across samples.";
  }
  if (section === "traces-fit") {
    return "Fitted intensity for each cell. Shared y uses one scale across samples.";
  }
  if (section === "auc") return "Area under the curve for every sample.";
  if (section === "parameters-comparison") {
    return "Expression rate m0 k_TL against onset time t0 and against mRNA lifetime τ_mRNA.";
  }
  return "Onset time t0, expression rate m0 k_TL, mRNA lifetime τ_mRNA, protein lifetime τ_EGFP, and baseline intensity for every sample.";
}

function guessPlotSection(fileName: string): ResultPlotSection {
  const stem = fileName.replace(/\.png$/i, "");
  if (stem === "auc") return "auc";
  if (stem.includes("_vs_")) return "parameters-comparison";
  if (stem.includes("summary")) return "traces-summary";
  if (stem.startsWith("area")) return "area";
  if (stem.includes("fit")) return "traces-fit";
  if (stem.startsWith("traces") || stem.startsWith("engagement_traces") || stem.startsWith("binding_")) return "traces";
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

/** Per-sample images sit side by side. Workspace plots already contain every sample. */
export type ResultPlotLayout = "sample" | "workspace";

/** Plots of one kind across samples, or all workspace-level plots, shown together as a grid. */
export type ResultPlotGroup = {
  title: string;
  plots: ResultPlot[];
  /** Per-plot caption inside the group: the sample folder, or the plot title for workspace plots. */
  labels: string[];
  layout: ResultPlotLayout;
};

export const WORKSPACE_PLOT_GROUP_TITLE = "All samples";

/**
 * Group plots for grid display: per-sample plots of the same file form one group (titled by
 * the plot kind, captioned by sample); workspace-level plots share one group. Order follows
 * first appearance.
 */
export function groupResultPlots(plots: ResultPlot[]): ResultPlotGroup[] {
  const groups = new Map<string, ResultPlotGroup>();
  for (const plot of plots) {
    const sample = sampleFolderFromResultPath(plot.path);
    const layout: ResultPlotLayout = sample ? "sample" : "workspace";
    const key = sample ? `sample:${plot.fileName}` : "workspace";
    let group = groups.get(key);
    if (!group) {
      const suffix = sample ? ` (${sample})` : "";
      const title =
        sample && plot.title.endsWith(suffix)
          ? plot.title.slice(0, -suffix.length)
          : sample
            ? plot.title
            : WORKSPACE_PLOT_GROUP_TITLE;
      group = { title, plots: [], labels: [], layout };
      groups.set(key, group);
    }
    group.plots.push(plot);
    group.labels.push(sample ?? plot.title);
  }
  return [...groups.values()];
}

/**
 * Per-sample grids stop at two columns. Three columns overflow the analysis
 * pane between the rails. Plots that already contain every sample use one
 * column so each figure stays full width.
 */
export function resultGridColumns(count: number, layout: ResultPlotLayout = "sample"): number {
  if (count <= 1 || layout === "workspace") return 1;
  return 2;
}

export function filterResultPlotsBySection(
  plots: ResultPlot[],
  section: ResultPlotSection,
): ResultPlot[] {
  return plots.filter((plot) => plot.section === section);
}

/** Sections that have at least one plot, in dock order. */
export function visibleResultPlotSections(plots: readonly ResultPlot[]): ResultPlotSection[] {
  const present = new Set(plots.map((plot) => plot.section));
  return RESULT_PLOT_SECTIONS.filter((section) => present.has(section));
}

export function defaultResultPlotSection(plots: ResultPlot[]): ResultPlotSection {
  return visibleResultPlotSections(plots)[0] ?? "traces";
}

/** Origin-relative URL of a workspace file on the server's file endpoint. */
export function resultFileUrl(path: string): string {
  return `/fs/file?path=${encodeURIComponent(path)}`;
}

export function withPlotSrc(plot: ResultPlot): ResultPlot {
  if (plot.src) return plot;
  return { ...plot, src: resultFileUrl(plot.path) };
}
