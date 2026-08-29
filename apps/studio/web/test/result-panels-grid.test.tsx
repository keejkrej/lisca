import { cleanup, render, screen } from "@solidjs/testing-library";
import type { ResultPlot } from "@lisca/analysis";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { ResultPlotGallery } from "../src/result/result-panels-grid";

afterEach(cleanup);

describe("ResultPlotGallery reactivity", () => {
  it("switches between empty and populated states when plots change", () => {
    const [plots, setPlots] = createSignal<ResultPlot[]>([]);
    render(() => (
      <ResultPlotGallery emptyMessage="Run analysis first" plots={plots()} section="timeseries" />
    ));

    expect(screen.getByText("Run analysis first")).toBeTruthy();

    setPlots([
      {
        fileName: "plot.png",
        path: "/plot.png",
        title: "Cell count",
        src: "/plot.png",
        section: "timeseries",
      },
    ]);
    expect(screen.queryByText("Run analysis first")).toBeNull();
    expect(screen.getByRole("img", { name: "Cell count" })).toBeTruthy();

    setPlots([]);
    expect(screen.getByText("Run analysis first")).toBeTruthy();
  });
});
