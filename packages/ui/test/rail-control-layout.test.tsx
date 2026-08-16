import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import {
  RailActionPair,
  RailControlStack,
  RailFieldPair,
  RailSectionStack,
  RailSidebar,
} from "../src/shell/regions/rail-control-layout";
import { SidebarStack } from "../src/shell/regions/sidebar-stack";

afterEach(cleanup);

describe("instrument rail control layout", () => {
  it("keeps the full rail as scroll owner while preserving a centered 200px measure", () => {
    const view = render(() => <RailSidebar aria-label="Instrument rail">Controls</RailSidebar>);

    const rail = view.getByLabelText("Instrument rail");
    const stack = rail.firstElementChild;
    expect(rail.classList.contains("h-full")).toBe(true);
    expect(rail.classList.contains("w-full")).toBe(true);
    expect(rail.classList.contains("overflow-y-auto")).toBe(true);
    expect(rail.classList.contains("px-7")).toBe(false);
    expect(rail.style.scrollbarGutter).toBe("stable both-edges");
    expect(stack?.getAttribute("data-slot")).toBe("rail-section-stack");
    expect(stack?.classList.contains("my-auto")).toBe(true);
    expect(stack?.classList.contains("w-[200px]")).toBe(true);
    expect(stack?.classList.contains("shrink-0")).toBe(true);
  });

  it("leaves the generic SidebarStack behavior available to classic surfaces", () => {
    const view = render(() => <SidebarStack aria-label="Classic sidebar">Controls</SidebarStack>);

    const sidebar = view.getByLabelText("Classic sidebar");
    expect(sidebar.classList.contains("overflow-auto")).toBe(true);
    expect(sidebar.classList.contains("p-2.5")).toBe(true);
    expect(sidebar.querySelector('[data-slot="rail-section-stack"]')).toBeNull();
  });

  it("uses the canonical 16px rhythm between stage sections", () => {
    const view = render(() => (
      <RailSectionStack aria-label="Rail sections">
        <section>First</section>
        <section>Second</section>
      </RailSectionStack>
    ));

    const stack = view.getByLabelText("Rail sections");
    expect(stack.getAttribute("data-rail-layout")).toBe("section-stack");
    expect(stack.classList.contains("gap-4")).toBe(true);
  });

  it("marks the full-width stack as the default rail composition", () => {
    const view = render(() => (
      <RailControlStack aria-label="Actions">
        <button type="button">First</button>
        <button type="button">Second</button>
      </RailControlStack>
    ));

    const stack = view.getByLabelText("Actions");
    expect(stack.getAttribute("data-slot")).toBe("rail-control-stack");
    expect(stack.getAttribute("data-rail-layout")).toBe("stack");
    expect(stack.classList.contains("flex-col")).toBe(true);
    expect(stack.classList.contains("w-full")).toBe(true);
  });

  it("names and packs a related action pair into adaptive 96px cells", () => {
    const view = render(() => (
      <RailActionPair class="custom-pair" data-purpose="test" label="History">
        <button type="button">Undo</button>
        <button type="button">Redo</button>
      </RailActionPair>
    ));

    const pair = view.getByRole("group", { name: "History" });
    expect(pair.getAttribute("data-slot")).toBe("rail-action-pair");
    expect(pair.getAttribute("data-rail-layout")).toBe("action-pair");
    expect(pair.getAttribute("data-purpose")).toBe("test");
    expect(pair.className).toContain("minmax(min(6rem,100%),1fr)");
    expect(pair.classList.contains("gap-2")).toBe(true);
    expect(pair.classList.contains("custom-pair")).toBe(true);
  });

  it("reserves the responsive pair layout for two 96px semantic peers", () => {
    const view = render(() => (
      <RailFieldPair aria-label="Offset coordinates">
        <label>Offset X</label>
        <label>Offset Y</label>
      </RailFieldPair>
    ));

    const pair = view.getByLabelText("Offset coordinates");
    expect(pair.getAttribute("data-slot")).toBe("rail-field-pair");
    expect(pair.getAttribute("data-rail-layout")).toBe("field-pair");
    expect(pair.className).toContain("minmax(min(6rem,100%),1fr)");
    expect(pair.classList.contains("gap-2")).toBe(true);
  });
});
