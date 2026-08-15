import type { StudioAnalysisCsvFile } from "@lisca/contracts";

import {
  parseCsvFile,
  parsePanelGroups,
  type ResultPanel,
  type SlideChannelLabels,
} from "../shared/panels";

export type FixtureAssayId = "transfection" | "killing";

export type AnalysisFixture = {
  id: FixtureAssayId;
  title: string;
  description: string;
  intervalMinutes: number;
  slideChannelLabels: SlideChannelLabels;
  files: StudioAnalysisCsvFile[];
};

const FIXTURE_BANNER = "Sample fixture data — not a real experiment.";

export function fixtureBanner(): string {
  return FIXTURE_BANNER;
}

function csvFile(
  kind: string,
  fileName: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): StudioAnalysisCsvFile {
  const lines = [
    headers.join(","),
    ...rows.map((row) => row.map((value) => String(value)).join(",")),
  ];
  return {
    kind,
    fileName,
    path: `fixture://${fileName}`,
    csv: `${lines.join("\n")}\n`,
  };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitter(random: () => number, value: number, fraction: number): number {
  return value * (1 + (random() * 2 - 1) * fraction);
}

function kineticIntensity(
  minutes: number,
  baseline: number,
  amplitude: number,
  proteinDecay: number,
  mrnaDecay: number,
  onset: number,
): number {
  if (minutes < onset) return baseline;
  const dt = minutes - onset;
  return baseline + amplitude * (Math.exp(-proteinDecay * dt) - Math.exp(-mrnaDecay * dt));
}

function logistic(t: number, midpoint: number, width: number): number {
  return 1 / (1 + Math.exp(-(t - midpoint) / width));
}

export function buildTransfectionFixture(): AnalysisFixture {
  const intervalMinutes = 10;
  const timeCount = 24;
  const roisPerPosition = 8;
  const slideChannelLabels: SlideChannelLabels = {
    0: "Mock (fixture)",
    1: "GFP (fixture)",
  };
  const samples = [
    {
      slide: 0,
      positions: [1, 2],
      baseline: 90,
      proteinLifetime: 800,
      mrnaLifetime: 180,
      onset: 40,
      expressionRate: 4,
      failEvery: 7,
    },
    {
      slide: 1,
      positions: [3, 4],
      baseline: 100,
      proteinLifetime: 720,
      mrnaLifetime: 150,
      onset: 20,
      expressionRate: 48,
      failEvery: 11,
    },
  ] as const;

  const timeseriesFiles: StudioAnalysisCsvFile[] = [];
  const aucRows: Array<Array<string | number>> = [];
  const fitRows: Array<Array<string | number>> = [];

  for (const sample of samples) {
    const proteinDecay = 1 / sample.proteinLifetime;
    const mrnaDecay = 1 / sample.mrnaLifetime;
    const amplitude = sample.expressionRate / (mrnaDecay - proteinDecay);
    for (const pos of sample.positions) {
      const rows: Array<Array<string | number>> = [];
      for (let roi = 1; roi <= roisPerPosition; roi += 1) {
        const roiRandom = mulberry32(2000 + sample.slide * 100 + pos * 20 + roi);
        const baseline = jitter(roiRandom, sample.baseline, 0.12);
        const onset = Math.max(0, jitter(roiRandom, sample.onset, 0.35));
        const rate = Math.max(0.4, jitter(roiRandom, sample.expressionRate, 0.28));
        const amp = rate / (mrnaDecay - proteinDecay);
        const success = roi % sample.failEvery !== 0;
        const area = Math.round(jitter(roiRandom, 96, 0.08));
        let auc = 0;
        let previous: { t: number; y: number } | null = null;
        for (let t = 0; t < timeCount; t += 1) {
          const minutes = t * intervalMinutes;
          const signal = success
            ? kineticIntensity(minutes, baseline, amp, proteinDecay, mrnaDecay, onset)
            : baseline + roiRandom() * 8;
          const noise = (roiRandom() - 0.5) * 0.06 * Math.max(signal, 1);
          const corrected = Math.max(0, signal + noise);
          const background = 12 + roiRandom() * 3;
          const sum = corrected + area * background;
          rows.push([roi, t, area, background.toFixed(3), sum.toFixed(3), corrected.toFixed(3)]);
          if (previous) {
            auc += ((previous.y + corrected) / 2) * (minutes - previous.t);
          }
          previous = { t: minutes, y: corrected };
        }
        aucRows.push([sample.slide, pos, roi, auc.toFixed(3)]);
        fitRows.push([
          sample.slide,
          pos,
          roi,
          success ? baseline.toFixed(3) : "",
          success ? proteinDecay.toFixed(6) : "",
          success ? sample.proteinLifetime.toFixed(3) : "",
          success ? mrnaDecay.toFixed(6) : "",
          success ? sample.mrnaLifetime.toFixed(3) : "",
          success ? onset.toFixed(3) : "",
          success ? amplitude.toFixed(3) : "",
          success ? rate.toFixed(3) : "",
          success ? "true" : "false",
        ]);
      }
      timeseriesFiles.push(
        csvFile(
          "timeseries",
          `Pos${pos}/ch1.csv`,
          ["roi", "t", "area", "background", "sum", "corrected"],
          rows,
        ),
      );
    }
  }

  return {
    id: "transfection",
    title: "Transfection (fixture)",
    description:
      "Two fixture samples (Mock vs GFP) with kinetic intensity traces, AUC, and fit parameters. Values are synthetic.",
    intervalMinutes,
    slideChannelLabels,
    files: [
      ...timeseriesFiles,
      csvFile("results", "auc.csv", ["slide", "pos", "roi", "auc"], aucRows),
      csvFile(
        "results",
        "fit.csv",
        [
          "slide",
          "pos",
          "roi",
          "baseline_intensity",
          "protein_decay_rate",
          "protein_lifetime",
          "mrna_decay_rate",
          "mrna_lifetime",
          "onset_time",
          "expression_amplitude",
          "expression_rate",
          "success",
        ],
        fitRows,
      ),
    ],
  };
}

export function buildKillingFixture(): AnalysisFixture {
  const intervalMinutes = 15;
  const timeCount = 20;
  const roisPerPosition = 10;
  const slideChannelLabels: SlideChannelLabels = {
    0: "Control (fixture)",
    1: "CAR-T 1:4 (fixture)",
    2: "CAR-T 1:1 (fixture)",
  };
  const samples = [
    { slide: 0, positions: [1, 2], deathMid: 17, deathWidth: 3, deathFraction: 0.35 },
    { slide: 1, positions: [3, 4], deathMid: 11, deathWidth: 2.2, deathFraction: 0.75 },
    { slide: 2, positions: [5, 6], deathMid: 6, deathWidth: 1.6, deathFraction: 0.92 },
  ] as const;

  const timeseriesFiles: StudioAnalysisCsvFile[] = [];
  const deathRows: Array<Array<string | number>> = [];
  const deathsBySlide = new Map<number, number[]>();

  for (const sample of samples) {
    for (const pos of sample.positions) {
      const rows: Array<Array<string | number>> = [];
      for (let roi = 1; roi <= roisPerPosition; roi += 1) {
        const random = mulberry32(4000 + sample.slide * 80 + pos * 20 + roi);
        const dies = random() < sample.deathFraction;
        const deathFrame = dies
          ? Math.max(1, Math.min(timeCount - 1, Math.round(jitter(random, sample.deathMid, 0.28))))
          : 0;
        deathRows.push([roi, deathFrame, pos, sample.slide]);
        if (deathFrame > 0) {
          const bucket = deathsBySlide.get(sample.slide) ?? [];
          bucket.push(deathFrame);
          deathsBySlide.set(sample.slide, bucket);
        }
        for (let t = 0; t < timeCount; t += 1) {
          const midpoint = dies ? deathFrame : timeCount + 4;
          const pDead = Math.min(
            1,
            Math.max(0, logistic(t, midpoint, sample.deathWidth) + (random() - 0.5) * 0.06),
          );
          rows.push([roi, t, pDead.toFixed(4)]);
        }
      }
      timeseriesFiles.push(
        csvFile("timeseries", `Pos${pos}/ch1.csv`, ["roi", "t", "p_dead"], rows),
      );
    }
  }

  const curveRows: Array<Array<string | number>> = [];
  for (const [slide, deaths] of Array.from(deathsBySlide.entries()).toSorted(
    ([left], [right]) => left - right,
  )) {
    const maxT = Math.max(...deaths, timeCount - 1);
    for (let t = 0; t <= maxT; t += 1) {
      const nAlive = deaths.filter((death) => death >= t).length;
      curveRows.push([t, nAlive, slide]);
    }
  }

  return {
    id: "killing",
    title: "Killing (fixture)",
    description:
      "Three fixture samples (Control, CAR-T 1:4, CAR-T 1:1) with P(dead) traces, kill curves, and death times. Values are synthetic.",
    intervalMinutes,
    slideChannelLabels,
    files: [
      ...timeseriesFiles,
      csvFile("results", "death_times.csv", ["crop", "death_time", "pos", "slide"], deathRows),
      csvFile("results", "kill_curve.csv", ["t", "n_alive", "slide"], curveRows),
    ],
  };
}

export const ANALYSIS_FIXTURES: Record<FixtureAssayId, () => AnalysisFixture> = {
  transfection: buildTransfectionFixture,
  killing: buildKillingFixture,
};

export function listAnalysisFixtures(): AnalysisFixture[] {
  return [buildTransfectionFixture(), buildKillingFixture()];
}

export function loadFixturePanels(fixture: AnalysisFixture): {
  timeseriesPanels: ResultPanel[];
  parameterPanels: ResultPanel[];
} {
  const timeseriesPanels: ResultPanel[] = [];
  const parameterPanels: ResultPanel[] = [];
  for (const file of fixture.files) {
    const parsed = parseCsvFile(file);
    if (!parsed) continue;
    const panels = parsePanelGroups(parsed, fixture.intervalMinutes, fixture.slideChannelLabels);
    if (file.kind === "timeseries") {
      timeseriesPanels.push(...panels.filter((panel) => panel.kind === "timeseries"));
    } else {
      parameterPanels.push(...panels);
    }
  }
  return { timeseriesPanels, parameterPanels };
}
