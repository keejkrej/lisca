import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { ResultPlot } from "@lisca/analysis";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { AnalysisPlotGallery } from "../src/analysis/analysis-plot-gallery";
import { cleanupMounted, flushMicrotasks, mountTest } from "./render-helper";

afterEach(cleanupMounted);

describe("AnalysisPlotGallery reactivity", () => {
  it("switches between empty and populated states when plots change", async () => {
    const Msg = UiSchema.TaggedEnum({
      SetPlots: { plots: Schema.Array(Schema.Any) },
    });

    const Host = Html.component({
      name: "AnalysisPlotGalleryReactivityHost",
      props: Schema.Struct({}),
      model: Schema.Struct({
        plots: Schema.Array(Schema.Any),
      }),
      message: Msg,
    }).make({
      init: () => ({ plots: [] }),
      update: {
        SetPlots: ($, { plots }) => $.evolve({ plots }),
      },
      view: (h, model) =>
        h.div.children(
          AnalysisPlotGallery(h, {
            emptyMessage: "Run analysis first",
            plots: model.plots as readonly ResultPlot[],
            section: "traces",
          }),
        ),
    });

    const { container, root } = await mountTest(Host, {});

    expect(container.textContent).toContain("Run analysis first");

    root.send(
      Msg.SetPlots({
        plots: [
          {
            fileName: "plot.png",
            path: "/plot.png",
            title: "Cell count",
            src: "/plot.png",
            section: "traces",
          },
        ],
      }),
    );
    await flushMicrotasks();

    expect(container.textContent).not.toContain("Run analysis first");
    expect(container.querySelector('img[alt="Cell count"]')).toBeTruthy();

    root.send(Msg.SetPlots({ plots: [] }));
    await flushMicrotasks();

    expect(container.textContent).toContain("Run analysis first");
  });

  it("shows every per-sample traces.png with the sample folder in the title", async () => {
    const plots: ResultPlot[] = [
      {
        fileName: "traces.png",
        path: "/results/A431_aiLNP/traces.png",
        title: "Intensity traces (A431_aiLNP)",
        src: "/results/A431_aiLNP/traces.png",
        section: "traces",
      },
      {
        fileName: "traces.png",
        path: "/results/Mock_(fixture)/traces.png",
        title: "Intensity traces (Mock_(fixture))",
        src: "/results/Mock_(fixture)/traces.png",
        section: "traces",
      },
    ];

    const Host = Html.component({
      name: "AnalysisPlotGallerySamplesHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: {},
      view: (h) => h.div.children(AnalysisPlotGallery(h, { plots })),
    });

    const { container } = await mountTest(Host, {});

    expect(container.querySelector('img[alt="Intensity traces (A431_aiLNP)"]')).toBeTruthy();
    expect(container.querySelector('img[alt="Intensity traces (Mock_(fixture))"]')).toBeTruthy();
  });

  it("uses two columns for per-sample plots and one column for all-sample plots", async () => {
    const plots: ResultPlot[] = [
      ...["A", "B", "C", "D", "E"].map((sample) => ({
        fileName: "traces.png",
        path: `/results/${sample}/traces.png`,
        title: `Intensity traces (${sample})`,
        src: `/results/${sample}/traces.png`,
        section: "traces" as const,
      })),
      {
        fileName: "auc.png",
        path: "/results/auc.png",
        title: "AUC",
        src: "/results/auc.png",
        section: "auc" as const,
      },
      {
        fileName: "onset_time.png",
        path: "/results/onset_time.png",
        title: "Onset time t0",
        src: "/results/onset_time.png",
        section: "parameters" as const,
      },
    ];

    const Host = Html.component({
      name: "AnalysisPlotGalleryGridHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: {},
      view: (h) => h.div.children(AnalysisPlotGallery(h, { plots })),
    });

    const { container } = await mountTest(Host, {});

    const grids = [...container.querySelectorAll(".grid")].map(
      (grid) => (grid as HTMLElement).style.gridTemplateColumns,
    );
    expect(grids).toEqual(["repeat(2, minmax(0, 1fr))", "repeat(1, minmax(0, 1fr))"]);
  });
});
