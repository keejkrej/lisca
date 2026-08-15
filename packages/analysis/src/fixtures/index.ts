import type { StudioAnalysisCsvFile } from "@lisca/contracts";

import type { ResultAssayKind, ResultPlot, ResultPlotSection } from "../shared/plots";
import { FIXTURE_PNG_DATA_URLS } from "./png-data";

export type FixtureAssayId = "transfection" | "killing";

export type AnalysisFixture = {
  id: FixtureAssayId;
  title: string;
  description: string;
  intervalMinutes: number;
  slideChannelLabels: Record<number, string>;
  files: StudioAnalysisCsvFile[];
  plots: ResultPlot[];
};

const FIXTURE_BANNER = "Sample fixture data — not a real experiment.";

export function fixtureBanner(): string {
  return FIXTURE_BANNER;
}

function plotFile(
  fileName: keyof typeof FIXTURE_PNG_DATA_URLS,
  title: string,
  section: ResultPlotSection,
): ResultPlot {
  const src = FIXTURE_PNG_DATA_URLS[fileName];
  return {
    fileName: `${fileName}.png`,
    path: `fixture://${fileName}.png`,
    title,
    section,
    src,
  };
}

function asResultFile(plot: ResultPlot): StudioAnalysisCsvFile {
  return {
    kind: "plot",
    fileName: plot.fileName,
    path: plot.path,
    csv: "",
  };
}

export function buildTransfectionFixture(): AnalysisFixture {
  const plots = [
    plotFile("traces", "Intensity traces", "timeseries"),
    plotFile("traces_summary", "Intensity summary", "timeseries"),
    plotFile("area", "Mask area", "timeseries"),
    plotFile("traces_fit", "Fitted traces", "timeseries"),
    plotFile("mrna_lifetime", "mRNA lifetime", "parameters"),
    plotFile("auc", "AUC", "parameters"),
    plotFile("expression_rate", "expression rate", "parameters"),
    plotFile("onset_time", "onset time", "parameters"),
  ];
  return {
    id: "transfection",
    title: "Transfection (fixture)",
    description:
      "Fixture transfection workspace showing the PNG plots analysis writes (traces, area, fit, and parameter boxplots). Images are sample placeholders.",
    intervalMinutes: 10,
    slideChannelLabels: {
      0: "Mock (fixture)",
      1: "GFP (fixture)",
    },
    files: plots.map(asResultFile),
    plots,
  };
}

export function buildKillingFixture(): AnalysisFixture {
  const plots = [
    plotFile("traces", "P(dead) traces", "timeseries"),
    plotFile("kill_curve", "N(alive)", "parameters"),
    plotFile("death_times", "T_death", "parameters"),
  ];
  return {
    id: "killing",
    title: "Killing (fixture)",
    description:
      "Fixture killing workspace showing the PNG plots analysis writes (P(dead) traces, kill curve, death times). Images are sample placeholders.",
    intervalMinutes: 15,
    slideChannelLabels: {
      0: "Control (fixture)",
      1: "CAR-T 1:4 (fixture)",
      2: "CAR-T 1:1 (fixture)",
    },
    files: plots.map(asResultFile),
    plots,
  };
}

export const ANALYSIS_FIXTURES: Record<FixtureAssayId, () => AnalysisFixture> = {
  transfection: buildTransfectionFixture,
  killing: buildKillingFixture,
};

export function listAnalysisFixtures(): AnalysisFixture[] {
  return [buildTransfectionFixture(), buildKillingFixture()];
}

export function loadFixturePlots(fixture: AnalysisFixture): {
  timeseriesPlots: ResultPlot[];
  parameterPlots: ResultPlot[];
} {
  return {
    timeseriesPlots: fixture.plots.filter((plot) => plot.section === "timeseries"),
    parameterPlots: fixture.plots.filter((plot) => plot.section === "parameters"),
  };
}

export type { ResultAssayKind };
