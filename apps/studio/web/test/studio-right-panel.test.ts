import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { studioExpertModeAtom } from "../src/atoms/studio-expert-atoms";
import { StudioRightPanel } from "../src/components/studio-right-panel";
import { resetStudioRegistry, studioRegistry } from "../src/state/studio-registry";
import { cleanupMounted, mountTest } from "./render-helper";

beforeEach(() => {
  resetStudioRegistry();
  studioRegistry.set(studioExpertModeAtom, true);
});

afterEach(async () => {
  await cleanupMounted();
});

function mountRightPanel(
  renderPanel: (h: Html.H<never>) => ReturnType<typeof StudioRightPanel<never>>,
) {
  const Host = Html.component({
    name: "StudioRightPanelTestHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Schema.Never,
  }).make({
    init: () => ({}),
    update: {},
    view: (h) => renderPanel(h),
  });
  return mountTest(Host as any, {});
}

describe("StudioRightPanel", () => {
  it("pins the rail measure to the leading margin and keeps short content vertically centered", async () => {
    const view = await mountRightPanel((h) =>
      StudioRightPanel(h, {
        key: "right-panel",
        expert: h.div.children("Expert controls"),
      }),
    );

    const scroll = view.container.querySelector('[data-slot="rail-sidebar-scroll"]');
    const stack = view.container.querySelector('[data-slot="rail-section-stack"]');
    const rail = view.container.firstElementChild;

    expect(scroll).not.toBeNull();
    expect(rail?.classList.contains("px-7")).toBe(false);
    expect(scroll?.querySelector('[data-slot="scroll-area-scrollbar"]')).not.toBeNull();
    expect((scroll as HTMLElement | null)?.style.scrollbarGutter).toBe("");
    expect(scroll?.classList.contains("w-rail-content")).toBe(false);
    expect(scroll?.classList.contains("justify-center")).toBe(false);
    expect(stack?.classList.contains("my-auto")).toBe(true);
    expect(stack?.classList.contains("ml-rail-inset")).toBe(true);
    expect(stack?.classList.contains("w-rail-content")).toBe(true);
    expect(stack?.classList.contains("gap-4")).toBe(true);
    expect(view.container.textContent).not.toContain("Instruction");
    expect(view.container.textContent).toContain("Expert controls");
  });

  it("shows default content when expert mode is persisted but no expert view exists", async () => {
    const view = await mountRightPanel((h) =>
      StudioRightPanel(h, {
        key: "right-panel-default",
        children: h.p.children("Default controls"),
      }),
    );

    expect(view.container.textContent).toContain("Default controls");
    expect(view.container.textContent).not.toContain("Instruction");
    const expertBtn = Array.from(view.container.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").trim() === "Expert mode",
    );
    expect(expertBtn).toBeUndefined();
  });

  it("keeps expert mode controls out of the scrolling rail", async () => {
    const view = await mountRightPanel((h) =>
      StudioRightPanel(h, {
        key: "right-panel-no-toggle",
        expert: h.div.children("Expert controls"),
      }),
    );

    const expertBtn = Array.from(view.container.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").trim() === "Expert mode",
    );
    expect(expertBtn).toBeUndefined();
  });
});
