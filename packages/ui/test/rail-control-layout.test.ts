import type { View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  RailActionPair,
  RailControlStack,
  RailFieldPair,
  RailSectionStack,
  RailSidebar,
} from "../src/patterns/regions/rail-control-layout";
import { SidebarStack } from "../src/patterns/regions/sidebar-stack";
import { cleanupMounted, mountTest } from "./render-helper";

afterEach(cleanupMounted);

function staticView(render: (h: Html.H<never>) => View.Content<never, never>) {
  return Html.component({
    name: "RailLayoutTestHost",
    model: Schema.Struct({}),
    message: Schema.Never,
  }).make({
    init: () => ({}),
    update: ($) => $.model,
    view: (h) => render(h),
  });
}

describe("instrument rail control layout", () => {
  it("pins a 200px measure to the leading margin under an overlay scrollbar", async () => {
    const view = await mountTest(
      staticView((h) => RailSidebar(h, { ariaLabel: "Instrument rail", children: "Controls" })),
      {},
    );

    const rail = view.container.querySelector('[aria-label="Instrument rail"]') as HTMLElement;
    const viewport = rail.querySelector('[data-slot="scroll-area-viewport"]')!;
    const content = viewport.firstElementChild!;
    const stack = content.firstElementChild;
    expect(rail.getAttribute("data-slot")).toBe("rail-sidebar-scroll");
    expect(rail.classList.contains("h-full")).toBe(true);
    expect(rail.classList.contains("w-full")).toBe(true);
    expect(rail.querySelector('[data-slot="scroll-area-scrollbar"]')).not.toBeNull();
    expect(viewport.classList.contains("no-scrollbar")).toBe(true);
    expect(viewport.classList.contains("overscroll-none")).toBe(true);
    expect(content.classList.contains("items-start")).toBe(true);
    expect(rail.classList.contains("px-7")).toBe(false);
    expect(rail.style.scrollbarGutter).toBe("");
    expect(stack?.getAttribute("data-slot")).toBe("rail-section-stack");
    expect(stack?.classList.contains("my-auto")).toBe(true);
    expect(stack?.classList.contains("ml-rail-inset")).toBe(true);
    expect(stack?.classList.contains("w-rail-content")).toBe(true);
    expect(stack?.classList.contains("shrink-0")).toBe(true);
  });

  it("leaves the generic SidebarStack behavior available to classic surfaces", async () => {
    const view = await mountTest(
      staticView((h) => SidebarStack(h, { ariaLabel: "Classic sidebar", children: "Controls" })),
      {},
    );

    const sidebar = view.container.querySelector('[aria-label="Classic sidebar"]')!;
    const viewport = sidebar.querySelector('[data-slot="scroll-area-viewport"]')!;
    const content = viewport.firstElementChild!;
    expect(viewport.classList.contains("no-scrollbar")).toBe(true);
    expect(viewport.classList.contains("overscroll-none")).toBe(true);
    expect(content.classList.contains("p-2.5")).toBe(true);
    expect(sidebar.querySelector('[data-slot="rail-section-stack"]')).toBeNull();
  });

  it("uses the canonical 16px rhythm between stage sections", async () => {
    const view = await mountTest(
      staticView((h) =>
        RailSectionStack(h)
          .attr("aria-label", "Rail sections")
          .children(h.section.children("First"), h.section.children("Second")),
      ),
      {},
    );

    const stack = view.container.querySelector('[aria-label="Rail sections"]')!;
    expect(stack.getAttribute("data-rail-layout")).toBe("section-stack");
    expect(stack.classList.contains("gap-4")).toBe(true);
  });

  it("marks the full-width stack as the default rail composition", async () => {
    const view = await mountTest(
      staticView((h) =>
        RailControlStack(h)
          .attr("aria-label", "Actions")
          .children(
            h.button.attr("type", "button").children("First"),
            h.button.attr("type", "button").children("Second"),
          ),
      ),
      {},
    );

    const stack = view.container.querySelector('[aria-label="Actions"]')!;
    expect(stack.getAttribute("data-slot")).toBe("rail-control-stack");
    expect(stack.getAttribute("data-rail-layout")).toBe("stack");
    expect(stack.classList.contains("flex-col")).toBe(true);
    expect(stack.classList.contains("w-full")).toBe(true);
  });

  it("names and packs a related action pair into adaptive 96px cells", async () => {
    const view = await mountTest(
      staticView((h) =>
        RailActionPair(h, { class: "custom-pair", label: "History" })
          .attr("data-purpose", "test")
          .children(
            h.button.attr("type", "button").children("Undo"),
            h.button.attr("type", "button").children("Redo"),
          ),
      ),
      {},
    );

    const pair = view.container.querySelector('[role="group"][aria-label="History"]')!;
    expect(pair.getAttribute("data-slot")).toBe("rail-action-pair");
    expect(pair.getAttribute("data-rail-layout")).toBe("action-pair");
    expect(pair.getAttribute("data-purpose")).toBe("test");
    expect(pair.className).toContain("minmax(min(6rem,100%),1fr)");
    expect(pair.classList.contains("gap-2")).toBe(true);
    expect(pair.classList.contains("custom-pair")).toBe(true);
  });

  it("reserves the responsive pair layout for two 96px semantic peers", async () => {
    const view = await mountTest(
      staticView((h) =>
        RailFieldPair(h)
          .attr("aria-label", "Offset coordinates")
          .children(h.label.children("Offset X"), h.label.children("Offset Y")),
      ),
      {},
    );

    const pair = view.container.querySelector('[aria-label="Offset coordinates"]')!;
    expect(pair.getAttribute("data-slot")).toBe("rail-field-pair");
    expect(pair.getAttribute("data-rail-layout")).toBe("field-pair");
    expect(pair.className).toContain("minmax(min(6rem,100%),1fr)");
    expect(pair.classList.contains("gap-2")).toBe(true);
  });
});
