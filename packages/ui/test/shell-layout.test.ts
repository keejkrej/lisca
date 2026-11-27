import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AppShell } from "../src/shell/layout/shell";
import { StageCanvas } from "../src/shell/layout/stage-canvas";
import { ViewportCard } from "../src/shell/layout/viewport-card";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

function stubViewport(width: number, height: number) {
  let viewportWidth = width;
  let viewportHeight = height;
  const listeners = new Set<() => void>();
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    get: () => viewportWidth,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    get: () => viewportHeight,
  });
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      get matches() {
        return query.includes("max-width") ? viewportWidth < 1024 : viewportHeight >= viewportWidth;
      },
      media: query,
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    })),
  );
  return {
    resize(nextWidth: number, nextHeight: number) {
      viewportWidth = nextWidth;
      viewportHeight = nextHeight;
      for (const listener of listeners) listener();
    },
  };
}

function hasClass(element: Element, className: string) {
  expect(element.classList.contains(className)).toBe(true);
}

function stageTopBar(): Element {
  const element = document.querySelector('[data-slot="app-shell-top-bar"]');
  expect(element).not.toBeNull();
  return element!;
}

afterEach(async () => {
  await cleanupMounted();
  vi.unstubAllGlobals();
});

describe("AppShell paper pane", () => {
  it("renders the paper-pane geometry with a hairline sheet and top bar", async () => {
    stubViewport(1440, 900);
    const Host = Html.component({
      name: "AppShellGeometryHost",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        AppShell(h, {
          left: "Left",
          right: "Right",
          topBar: "Top bar",
          main: "Main",
        }),
    });

    const view = await mountTest(Host, {});
    const root = view.container.firstElementChild!;
    const topBar = stageTopBar();
    const main = view.container.querySelector("main")!;
    const mainColumn = main.parentElement!;
    const leftPanel = view.container.querySelector('[aria-label="Left panel"]')!;
    const rightPanel = view.container.querySelector('[aria-label="Right panel"]')!;

    hasClass(root, "bg-stage");
    hasClass(root, "py-4");
    hasClass(root, "overflow-clip");
    hasClass(root, "overscroll-none");
    hasClass(leftPanel, "w-rail");
    expect(leftPanel.classList.contains("border-r")).toBe(false);
    hasClass(rightPanel, "w-rail");
    hasClass(mainColumn, "gap-3");
    hasClass(mainColumn, "overflow-visible");
    hasClass(topBar, "h-topbar");
    hasClass(topBar, "px-5");
    hasClass(topBar, "rounded-none");
    hasClass(topBar, "bg-paper");
    hasClass(topBar, "border");
    hasClass(topBar, "border-rule");
    expect(topBar.className).not.toContain("shadow-[");
    hasClass(main, "rounded-none");
    hasClass(main, "bg-paper");
    hasClass(main, "border");
    hasClass(main, "border-rule");
    expect(main.className).not.toContain("shadow-[");
    hasClass(main, "overflow-clip");
    expect(root.getAttribute("data-variant")).toBeNull();
  });

  it("updates a sidebar width class passed from reactive state", async () => {
    stubViewport(1200, 800);
    const Msg = UiSchema.TaggedEnum({ SetWidth: { widthClass: Schema.String } });
    const Host = Html.component({
      name: "AppShellWidthHost",
      model: Schema.Struct({ widthClass: Schema.String }),
      message: Msg,
    }).make({
      init: () => ({ widthClass: "w-64" }),
      update: { SetWidth: ($, { widthClass }) => $.evolve({ widthClass }) },
      view: (h, model) =>
        AppShell(h, {
          left: "Left",
          leftWidthClass: model.widthClass,
          main: "Main",
        }),
    });

    const view = await mountTest(Host, {});
    const sidebar = view.container.querySelector('[aria-label="Left panel"]')!;
    hasClass(sidebar, "w-64");
    view.root.send(Msg.SetWidth({ widthClass: "w-72" }));
    await flushMicrotasks();
    expect(view.container.querySelector('[aria-label="Left panel"]')).toBe(sidebar);
    hasClass(sidebar, "w-72");
  });

  it("keeps an overlay document scrollbar at the full main-sheet edge", async () => {
    stubViewport(1440, 900);
    const Host = Html.component({
      name: "AppShellScrollHost",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        AppShell(h, {
          main: AppShell.MainScroll(h, {
            contentClass: "max-w-[52rem]",
            children: h.div.children("Measured document"),
          }),
        }),
    });

    const view = await mountTest(Host, {});
    const main = view.container.querySelector("main")!;
    const scroll = main.querySelector('[data-slot="app-shell-main-scroll"]');
    const viewport = scroll?.querySelector('[data-slot="scroll-area-viewport"]');
    const content = viewport?.firstElementChild;
    expect(scroll).not.toBeNull();
    expect(scroll?.parentElement).toBe(main);
    hasClass(scroll!, "w-full");
    expect(scroll!.querySelector('[data-slot="scroll-area-scrollbar"]')).not.toBeNull();
    hasClass(viewport!, "overflow-auto");
    hasClass(viewport!, "no-scrollbar");
    hasClass(viewport!, "overscroll-none");
    expect(content).not.toBeNull();
    hasClass(content!, "mx-auto");
    hasClass(content!, "min-h-full");
    hasClass(content!, "max-w-[52rem]");
    expect(content!.classList.contains("overflow-y-auto")).toBe(false);
  });

  it("keeps rails as 256px portrait overlays owned by Body", async () => {
    stubViewport(600, 900);
    const Host = Html.component({
      name: "AppShellPortraitHost",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        AppShell(h, {
          left: h.div.children("Left content"),
          right: h.div.children("Right content"),
          topBar: "Top bar",
          main: "Main",
        }),
    });

    const view = await mountTest(Host, {});
    const leftOverlay = view.container.querySelector('[aria-label="Left panel"]') as HTMLElement;
    const rightOverlay = view.container.querySelector('[aria-label="Right panel"]') as HTMLElement;
    const topBar = stageTopBar();
    const panelOf = (overlay: HTMLElement) =>
      overlay.querySelector('[data-slot="scroll-area-content"]')!.firstElementChild!;

    hasClass(panelOf(leftOverlay), "w-rail");
    hasClass(panelOf(rightOverlay), "w-rail");
    expect(leftOverlay.getAttribute("aria-hidden")).toBe("true");
    expect(leftOverlay.hasAttribute("inert")).toBe(true);
    hasClass(leftOverlay, "bg-stage");
    expect(leftOverlay.classList.contains("border-r")).toBe(false);

    clickElement(view.container.querySelector('[aria-label="Open left panel"]')!);
    await flushMicrotasks();
    const liveLeft = view.container.querySelector('[aria-label="Left panel"]') as HTMLElement;
    expect(liveLeft.getAttribute("aria-hidden")).toBe("false");
    expect(liveLeft.hasAttribute("inert")).toBe(false);
    const scrim = view.container.querySelector('[aria-label="Close side panels"]')!;
    expect(scrim.parentElement).toBe(topBar.parentElement!.parentElement);

    clickElement(scrim);
    await flushMicrotasks();
    const closedLeft = view.container.querySelector('[aria-label="Left panel"]') as HTMLElement;
    expect(closedLeft.getAttribute("aria-hidden")).toBe("true");
    expect(closedLeft.hasAttribute("inert")).toBe(true);
  });

  it.each([
    [900, 700],
    [800, 600],
  ])("uses body-owned overlays at constrained landscape size %ix%i", async (width, height) => {
    stubViewport(width, height);
    const Host = Html.component({
      name: "AppShellConstrainedHost",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        AppShell(h, {
          left: "Left content",
          right: "Right content",
          topBar: "Top bar",
          main: "Main",
        }),
    });

    const view = await mountTest(Host, {});
    const leftOverlay = view.container.querySelector('[aria-label="Left panel"]') as HTMLElement;
    const rightOverlay = view.container.querySelector('[aria-label="Right panel"]') as HTMLElement;
    expect(leftOverlay.getAttribute("aria-hidden")).toBe("true");
    expect(rightOverlay.getAttribute("aria-hidden")).toBe("true");
    expect(view.container.querySelector('[aria-label="Open left panel"]')).toBeTruthy();
    expect(view.container.querySelector('[aria-label="Open right panel"]')).toBeTruthy();

    clickElement(view.container.querySelector('[aria-label="Open right panel"]')!);
    await flushMicrotasks();
    const scrim = view.container.querySelector('[aria-label="Close side panels"]')!;
    const liveRight = view.container.querySelector('[aria-label="Right panel"]') as HTMLElement;
    expect(liveRight.getAttribute("aria-hidden")).toBe("false");
    expect(scrim.parentElement).toBe(stageTopBar().parentElement?.parentElement);
  });

  it("switches between inline rails and portrait overlays across viewport resizes", async () => {
    const viewport = stubViewport(1200, 700);
    const Host = Html.component({
      name: "AppShellResizeHost",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        AppShell(h, {
          left: h.button.attr("type", "button").children("Persistent rail action"),
          main: "Main",
        }),
    });

    const view = await mountTest(Host, {});
    expect(
      view.container.querySelector('[aria-label="Left panel"]')?.hasAttribute("aria-hidden"),
    ).toBe(false);

    viewport.resize(900, 700);
    await flushMicrotasks();
    expect(
      view.container.querySelector('[aria-label="Left panel"]')?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(view.container.querySelector('[aria-label="Open left panel"]')).toBeTruthy();

    viewport.resize(1200, 700);
    await flushMicrotasks();
    expect(
      view.container.querySelector('[aria-label="Left panel"]')?.hasAttribute("aria-hidden"),
    ).toBe(false);
    expect(view.container.querySelector('[aria-label="Open left panel"]')).toBeNull();
  });

  it("focuses main content from the skip link without changing the URL hash", async () => {
    stubViewport(1440, 900);
    window.history.replaceState(null, "", "#/metadata");
    const Host = Html.component({
      name: "AppShellSkipLinkHost",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        AppShell(h, {
          main: h.div.children("Main content"),
        }),
    });

    try {
      const view = await mountTest(Host, {});
      const skipLink = view.container.querySelector<HTMLAnchorElement>('a[href="#main-content"]');
      const main = view.container.querySelector<HTMLElement>("#main-content");
      expect(skipLink).not.toBeNull();
      expect(main).not.toBeNull();

      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      skipLink!.dispatchEvent(event);
      await flushMicrotasks();

      expect(event.defaultPrevented).toBe(true);
      expect(window.location.hash).toBe("#/metadata");
      expect(document.activeElement).toBe(main);
    } finally {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  });
});

describe("ViewportCard paper pane", () => {
  it("centers a 24px padded sheet without a nested panel frame", async () => {
    const Host = Html.component({
      name: "ViewportCardHost",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) => ViewportCard(h, { contentClass: "flex-none max-w-[720px]", children: "Canvas" }),
    });

    const view = await mountTest(Host, {});
    const outer = view.container.firstElementChild!;
    const content = outer.firstElementChild!;
    hasClass(outer, "p-6");
    hasClass(outer, "items-center");
    expect(content.classList.contains("rounded-xl")).toBe(false);
    hasClass(content, "flex-none");
    hasClass(content, "max-w-[720px]");
  });
});

describe("StageCanvas framing", () => {
  it("fills the viewport with a paper well and pins the caption below it", async () => {
    const Host = Html.component({
      name: "StageCanvasHost",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        StageCanvas(h, {
          captionLeft: "Position 01",
          captionRight: "1024 × 768 px",
          children: h.div.attr("data-testid", "stage-child").children("canvas"),
        }),
    });

    const view = await mountTest(Host, {});
    const root = view.container.querySelector('[data-testid="stage-child"]')!.parentElement!
      .parentElement!;
    hasClass(root, "h-full");
    hasClass(root, "min-h-0");
    hasClass(root, "gap-5");
    const well = root.firstElementChild!;
    hasClass(well, "flex-1");
    hasClass(well, "min-h-0");
    hasClass(well, "rounded-none");
    hasClass(well, "bg-paper");
    expect(well.className).not.toMatch(/aspect-/);
    expect(view.container.textContent).toContain("Position 01");
    expect(view.container.textContent).toContain("1024 × 768 px");
    const caption = root.lastElementChild!;
    hasClass(caption, "shrink-0");
    hasClass(caption, "tracking-[0.12em]");
    hasClass(caption, "text-muted-foreground");
  });
});
