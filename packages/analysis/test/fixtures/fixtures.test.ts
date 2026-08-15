import { describe, expect, it } from "vitest";
import { chartSpecForPanel } from "../../src/charts/chart-spec";
import {
  buildKillingFixture,
  buildTransfectionFixture,
  loadFixturePanels,
} from "../../src/fixtures";

describe("analysis fixtures", () => {
  it("builds transfection panels for traces, AUC, and fits", () => {
    const fixture = buildTransfectionFixture();
    expect(fixture.files.some((file) => file.fileName === "auc.csv")).toBe(true);
    expect(fixture.files.some((file) => file.fileName === "fit.csv")).toBe(true);
    expect(fixture.files[0]?.csv.startsWith("roi,t,area")).toBe(true);
    const { timeseriesPanels, parameterPanels } = loadFixturePanels(fixture);
    expect(timeseriesPanels.length).toBeGreaterThan(0);
    expect(
      parameterPanels.some((panel) => panel.kind === "boxplot" && panel.yAxisLabel === "AUC"),
    ).toBe(true);
    expect(
      parameterPanels.some(
        (panel) => panel.kind === "boxplot" && panel.yAxisLabel === "expression rate",
      ),
    ).toBe(true);
    expect(timeseriesPanels.every((panel) => chartSpecForPanel(panel))).toBe(true);
    expect(parameterPanels.every((panel) => chartSpecForPanel(panel))).toBe(true);
  });

  it("builds killing panels for P(dead), kill curves, and death times", () => {
    const fixture = buildKillingFixture();
    expect(fixture.files.some((file) => file.fileName === "kill_curve.csv")).toBe(true);
    expect(fixture.files.some((file) => file.fileName === "death_times.csv")).toBe(true);
    const { timeseriesPanels, parameterPanels } = loadFixturePanels(fixture);
    expect(
      timeseriesPanels.some(
        (panel) => panel.kind === "timeseries" && panel.yAxisLabel === "P(dead)",
      ),
    ).toBe(true);
    const kill = parameterPanels.find(
      (panel) => panel.kind === "generic" && panel.yAxisLabel === "N(alive)",
    );
    expect(kill?.kind).toBe("generic");
    if (kill?.kind !== "generic") return;
    expect(kill.series.length).toBe(3);
    expect(parameterPanels.filter((panel) => panel.kind === "histogram")).toHaveLength(3);
    expect(timeseriesPanels.every((panel) => chartSpecForPanel(panel))).toBe(true);
    expect(parameterPanels.every((panel) => chartSpecForPanel(panel))).toBe(true);
  });
});
