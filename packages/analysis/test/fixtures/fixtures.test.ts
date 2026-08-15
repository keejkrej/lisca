import { describe, expect, it } from "vitest";
import {
  buildKillingFixture,
  buildTransfectionFixture,
  loadFixturePlots,
} from "../../src/fixtures";

describe("analysis fixtures", () => {
  it("ships transfection PNG filenames the Rust pipeline writes", () => {
    const fixture = buildTransfectionFixture();
    const names = fixture.plots.map((plot) => plot.fileName);
    expect(names).toEqual([
      "traces.png",
      "traces_summary.png",
      "area.png",
      "traces_fit.png",
      "mrna_lifetime.png",
      "auc.png",
      "expression_rate.png",
      "onset_time.png",
    ]);
    expect(fixture.plots.every((plot) => plot.src?.startsWith("data:image/png;base64,"))).toBe(
      true,
    );
    const { timeseriesPlots, parameterPlots } = loadFixturePlots(fixture);
    expect(timeseriesPlots).toHaveLength(4);
    expect(parameterPlots).toHaveLength(4);
  });

  it("ships killing PNG filenames the Rust pipeline writes", () => {
    const fixture = buildKillingFixture();
    expect(fixture.plots.map((plot) => plot.fileName)).toEqual([
      "traces.png",
      "kill_curve.png",
      "death_times.png",
    ]);
    expect(fixture.plots.every((plot) => plot.src?.startsWith("data:image/png;base64,"))).toBe(
      true,
    );
    const { timeseriesPlots, parameterPlots } = loadFixturePlots(fixture);
    expect(timeseriesPlots).toHaveLength(1);
    expect(parameterPlots).toHaveLength(2);
  });
});
