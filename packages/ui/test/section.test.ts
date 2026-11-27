import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { PanelSection } from "../src/patterns/regions/panel-section";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

afterEach(cleanupMounted);

const SectionsHost = Html.component({
  name: "SectionsHost",
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) =>
    h.div.class("lisca-instrument-shell").children(
      PanelSection(h, { key: "framed", title: "Framed section", children: "Framed content" }),
      PanelSection(h, {
        key: "rail",
        appearance: "rail",
        description: "Rail description",
        title: "Rail section",
        children: "Rail content",
      }),
    ),
});

describe("PanelSection appearance", () => {
  it("keeps framed as the default and exposes an opt-in rail treatment", async () => {
    const view = await mountTest(SectionsHost, {});
    const buttons = [...view.container.querySelectorAll("button")];
    const framedTrigger = buttons.find((b) => b.textContent?.includes("Framed section"))!;
    const railTrigger = buttons.find((b) => b.textContent?.includes("Rail section"))!;
    const framedSection = framedTrigger.closest("[data-section-appearance]");
    const railSection = railTrigger.closest("[data-section-appearance]");

    expect(framedSection?.getAttribute("data-section-appearance")).toBe("framed");
    expect(railSection?.getAttribute("data-section-appearance")).toBe("rail");
    expect(railSection?.classList.contains("py-2.5")).toBe(false);
    expect(railSection?.classList.contains("gap-2")).toBe(true);
    expect(railSection?.classList.contains("p-2.5")).toBe(false);
    expect(railSection?.querySelector('[data-slot="panel-header"]')?.className).not.toContain(
      "px-",
    );
    expect(railSection?.querySelector('[data-slot="panel-content"]')?.className).not.toContain(
      "px-",
    );
    expect(framedTrigger.classList.contains("leading-5")).toBe(false);
    expect(railTrigger.classList.contains("text-sm")).toBe(true);
    expect(railTrigger.classList.contains("leading-5")).toBe(true);
    expect(railSection?.querySelector('[data-slot="section-title"]')?.textContent).toBe(
      "Rail section",
    );
    const description = railSection?.querySelector('[data-slot="section-description"]');
    expect(description?.classList.contains("text-xs")).toBe(true);
    expect(description?.classList.contains("leading-4")).toBe(true);
    expect(view.container.textContent).toContain("Rail content");

    clickElement(railTrigger);
    await flushMicrotasks();

    expect(railTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(view.container.textContent).not.toContain("Rail content");
    expect(view.container.textContent).toContain("Framed content");
  });
});
