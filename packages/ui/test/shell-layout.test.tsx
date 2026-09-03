import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "../src/shell/layout/shell";
import { StageCanvas } from "../src/shell/layout/stage-canvas";
import { ViewportCard } from "../src/shell/layout/viewport-card";

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

const overflowClipClasses = [
  "overflow-hidden",
  "overflow-clip",
  "overflow-auto",
  "overflow-scroll",
  "overflow-x-hidden",
  "overflow-y-hidden",
] as const;

function doesNotClipPaintedOverflow(element: Element) {
  for (const className of overflowClipClasses) {
    expect(element.classList.contains(className)).toBe(false);
  }
}

const stageSheetShadowClass = "shadow-[0_8px_24px_#0000000c]";

function stageTopBar(): Element {
  const element = document.querySelector('[data-slot="app-shell-top-bar"]');
  expect(element).not.toBeNull();
  return element!;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AppShell stage layout", () => {
  it("keeps the classic presentation unchanged by default", () => {
    stubViewport(1200, 800);
    const view = render(() => (
      <AppShell>
        <AppShell.Header>Header</AppShell.Header>
        <AppShell.Body>
          <AppShell.Left>Left</AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.Main>Main</AppShell.Main>
          </AppShell.MainColumn>
          <AppShell.Right>Right</AppShell.Right>
        </AppShell.Body>
      </AppShell>
    ));

    const root = view.container.firstElementChild!;
    const main = screen.getByRole("main");
    hasClass(root, "bg-background");
    hasClass(root, "overflow-hidden");
    expect(root.classList.contains("py-4")).toBe(false);
    hasClass(screen.getByLabelText("Left panel"), "w-56");
    hasClass(screen.getByLabelText("Left panel"), "border-r");
    hasClass(screen.getByLabelText("Right panel"), "w-56");
    hasClass(main, "overflow-auto");
    hasClass(main.parentElement!, "overflow-hidden");
  });

  it("updates a sidebar width class passed from reactive state", () => {
    stubViewport(1200, 800);
    const [widthClass, setWidthClass] = createSignal("w-56");
    render(() => (
      <AppShell>
        <AppShell.Body>
          <AppShell.Left widthClass={widthClass()}>Left</AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.Main>Main</AppShell.Main>
          </AppShell.MainColumn>
        </AppShell.Body>
      </AppShell>
    ));

    const sidebar = screen.getByLabelText("Left panel");
    hasClass(sidebar, "w-56");
    setWidthClass("w-72");
    expect(screen.getByLabelText("Left panel")).toBe(sidebar);
    hasClass(sidebar, "w-72");
  });

  it("renders the Paper stage geometry without clipping its central shadows", () => {
    stubViewport(1440, 900);
    const view = render(() => (
      <AppShell variant="stage">
        <AppShell.Body>
          <AppShell.Left>Left</AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.TopBar>Top bar</AppShell.TopBar>
            <AppShell.Main>Main</AppShell.Main>
          </AppShell.MainColumn>
          <AppShell.Right>Right</AppShell.Right>
        </AppShell.Body>
      </AppShell>
    ));

    const root = view.container.firstElementChild!;
    const topBar = stageTopBar();
    const main = screen.getByRole("main");
    const mainColumn = main.parentElement!;
    const body = mainColumn.parentElement!;
    const mainClip = main.querySelector('[data-slot="app-shell-main-clip"]');
    hasClass(root, "bg-muted");
    hasClass(root, "py-4");
    hasClass(root, "overflow-clip");
    hasClass(screen.getByLabelText("Left panel"), "w-64");
    expect(screen.getByLabelText("Left panel").classList.contains("border-r")).toBe(false);
    expect(screen.getByLabelText("Left panel").className).not.toMatch(/shadow-/);
    hasClass(screen.getByLabelText("Right panel"), "w-64");
    expect(screen.getByLabelText("Right panel").className).not.toMatch(/shadow-/);
    hasClass(body, "overflow-visible");
    doesNotClipPaintedOverflow(body);
    expect(body.classList.contains("px-4")).toBe(false);
    hasClass(mainColumn, "gap-3");
    hasClass(mainColumn, "overflow-visible");
    hasClass(mainColumn, "z-10");
    doesNotClipPaintedOverflow(mainColumn);
    hasClass(topBar, "h-14");
    hasClass(topBar, "px-5");
    hasClass(topBar, "rounded-2xl");
    hasClass(topBar, "overflow-visible");
    hasClass(topBar, stageSheetShadowClass);
    hasClass(topBar, "ring-1");
    hasClass(topBar, "ring-foreground/5");
    expect(topBar.classList.contains("border")).toBe(false);
    hasClass(main, "rounded-2xl");
    hasClass(main, "overflow-visible");
    hasClass(main, stageSheetShadowClass);
    hasClass(main, "ring-1");
    hasClass(main, "ring-foreground/5");
    expect(main.classList.contains("border")).toBe(false);
    expect(mainClip).not.toBeNull();
    hasClass(mainClip!, "overflow-clip");
    hasClass(mainClip!, "rounded-[inherit]");
  });

  it("keeps a stage document scrollbar at the full main-sheet edge", () => {
    stubViewport(1440, 900);
    render(() => (
      <AppShell variant="stage">
        <AppShell.Body>
          <AppShell.MainColumn>
            <AppShell.Main>
              <AppShell.MainScroll contentClass="max-w-[52rem]">
                <div>Measured document</div>
              </AppShell.MainScroll>
            </AppShell.Main>
          </AppShell.MainColumn>
        </AppShell.Body>
      </AppShell>
    ));

    const main = screen.getByRole("main");
    const clip = main.querySelector('[data-slot="app-shell-main-clip"]');
    const scroll = main.querySelector('[data-slot="app-shell-main-scroll"]');
    const content = scroll?.firstElementChild;
    expect(clip).not.toBeNull();
    expect(scroll).not.toBeNull();
    expect(scroll?.parentElement).toBe(clip);
    hasClass(scroll!, "w-full");
    hasClass(scroll!, "overflow-y-auto");
    expect(content).not.toBeNull();
    hasClass(content!, "mx-auto");
    hasClass(content!, "min-h-full");
    hasClass(content!, "max-w-[52rem]");
    expect(content!.classList.contains("overflow-y-auto")).toBe(false);
  });

  it("keeps stage rails registered as 256px portrait overlays owned by Body", () => {
    stubViewport(600, 900);
    render(() => (
      <AppShell variant="stage">
        <AppShell.Body>
          <AppShell.Left>
            <div>Left content</div>
          </AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.TopBar>Top bar</AppShell.TopBar>
            <AppShell.Main>Main</AppShell.Main>
          </AppShell.MainColumn>
          <AppShell.Right>
            <div>Right content</div>
          </AppShell.Right>
        </AppShell.Body>
      </AppShell>
    ));

    const leftOverlay = screen.getByLabelText("Left panel");
    const rightOverlay = screen.getByLabelText("Right panel");
    const topBar = stageTopBar();
    const main = screen.getByRole("main");
    const mainColumn = main.parentElement!;
    const body = mainColumn.parentElement!;
    hasClass(body, "px-4");
    doesNotClipPaintedOverflow(body);
    hasClass(mainColumn, "overflow-visible");
    hasClass(main, "overflow-visible");
    hasClass(main, stageSheetShadowClass);
    hasClass(leftOverlay.firstElementChild!, "w-64");
    hasClass(rightOverlay.firstElementChild!, "w-64");
    expect(leftOverlay.getAttribute("aria-hidden")).toBe("true");
    expect((leftOverlay as HTMLElement & { inert: boolean }).inert).toBe(true);
    hasClass(leftOverlay, "bg-muted");
    expect(leftOverlay.classList.contains("border-r")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Open left panel" }));
    expect(leftOverlay.getAttribute("aria-hidden")).toBe("false");
    expect((leftOverlay as HTMLElement & { inert: boolean }).inert).toBe(false);
    const scrim = screen.getByRole("button", { name: "Close side panels" });
    expect(scrim.parentElement).toBe(topBar.parentElement!.parentElement);

    fireEvent.click(scrim);
    expect(leftOverlay.getAttribute("aria-hidden")).toBe("true");
    expect((leftOverlay as HTMLElement & { inert: boolean }).inert).toBe(true);
  });

  it.each([
    [900, 700],
    [800, 600],
  ])("uses body-owned stage overlays at constrained landscape size %ix%i", (width, height) => {
    stubViewport(width, height);
    render(() => (
      <AppShell variant="stage">
        <AppShell.Body>
          <AppShell.Left>Left content</AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.TopBar>Top bar</AppShell.TopBar>
            <AppShell.Main>Main</AppShell.Main>
          </AppShell.MainColumn>
          <AppShell.Right>Right content</AppShell.Right>
        </AppShell.Body>
      </AppShell>
    ));

    const leftOverlay = screen.getByLabelText("Left panel");
    const rightOverlay = screen.getByLabelText("Right panel");
    const body = screen.getByRole("main").parentElement!.parentElement!;
    hasClass(body, "px-4");
    doesNotClipPaintedOverflow(body);
    expect(leftOverlay.getAttribute("aria-hidden")).toBe("true");
    expect(rightOverlay.getAttribute("aria-hidden")).toBe("true");
    expect((leftOverlay as HTMLElement & { inert: boolean }).inert).toBe(true);
    expect(screen.getByRole("button", { name: "Open left panel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open right panel" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open right panel" }));
    const scrim = screen.getByRole("button", { name: "Close side panels" });
    expect(rightOverlay.getAttribute("aria-hidden")).toBe("false");
    expect(scrim.parentElement).toBe(stageTopBar().parentElement?.parentElement);
  });

  it("preserves inline classic rails at the same constrained landscape width", () => {
    stubViewport(900, 700);
    render(() => (
      <AppShell>
        <AppShell.Body>
          <AppShell.Left>Left content</AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.Main>Main</AppShell.Main>
          </AppShell.MainColumn>
          <AppShell.Right>Right content</AppShell.Right>
        </AppShell.Body>
      </AppShell>
    ));

    expect(screen.getByLabelText("Left panel").hasAttribute("aria-hidden")).toBe(false);
    expect(screen.getByLabelText("Right panel").hasAttribute("aria-hidden")).toBe(false);
    expect(screen.queryByRole("button", { name: "Open left panel" })).toBeNull();
    expect(screen.getByRole("main").parentElement!.parentElement!.classList.contains("px-4")).toBe(
      false,
    );
  });

  it("moves a mounted stage rail across the inline threshold without remounting it", () => {
    const viewport = stubViewport(1200, 700);
    const mounted = vi.fn();

    function RailContent() {
      mounted();
      return <button type="button">Persistent rail action</button>;
    }

    render(() => (
      <AppShell variant="stage">
        <AppShell.Body>
          <AppShell.Left>
            <RailContent />
          </AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.Main>Main</AppShell.Main>
          </AppShell.MainColumn>
        </AppShell.Body>
      </AppShell>
    ));

    expect(mounted).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Left panel").hasAttribute("aria-hidden")).toBe(false);
    const body = screen.getByRole("main").parentElement!.parentElement!;
    expect(body.classList.contains("px-4")).toBe(false);

    viewport.resize(900, 700);

    expect(screen.getByLabelText("Left panel").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("button", { name: "Open left panel" })).toBeTruthy();
    expect(mounted).toHaveBeenCalledTimes(1);
    hasClass(body, "px-4");
    doesNotClipPaintedOverflow(body);

    viewport.resize(1200, 700);

    expect(screen.getByLabelText("Left panel").hasAttribute("aria-hidden")).toBe(false);
    expect(screen.queryByRole("button", { name: "Open left panel" })).toBeNull();
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(body.classList.contains("px-4")).toBe(false);
  });

  it("resolves each landscape rail child once without duplicating listeners", () => {
    stubViewport(1200, 800);
    const mounted = vi.fn();
    const cleanedUp = vi.fn();
    const listener = vi.fn();

    function RailContent() {
      mounted();
      createEffect(() => {
        window.addEventListener("lisca-shell-probe", listener);
        onCleanup(() => {
          window.removeEventListener("lisca-shell-probe", listener);
          cleanedUp();
        });
      });
      return <button type="button">Rail action</button>;
    }

    const view = render(() => (
      <AppShell>
        <AppShell.Body>
          <AppShell.Left>
            <RailContent />
          </AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.Main>Main</AppShell.Main>
          </AppShell.MainColumn>
        </AppShell.Body>
      </AppShell>
    ));

    expect(mounted).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("button", { name: "Rail action" })).toHaveLength(1);
    window.dispatchEvent(new Event("lisca-shell-probe"));
    expect(listener).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(cleanedUp).toHaveBeenCalledTimes(1);
  });

  it("preserves the classic portrait panel framing", () => {
    stubViewport(600, 900);
    render(() => (
      <AppShell>
        <AppShell.Body>
          <AppShell.Left>Left content</AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.Main>Main</AppShell.Main>
          </AppShell.MainColumn>
        </AppShell.Body>
      </AppShell>
    ));

    const leftOverlay = screen.getByLabelText("Left panel");
    hasClass(leftOverlay, "border-r");
    hasClass(leftOverlay, "bg-background");
    expect(leftOverlay.classList.contains("bg-muted")).toBe(false);
    expect(screen.getByRole("main").parentElement!.parentElement!.classList.contains("px-4")).toBe(
      false,
    );
  });
});

describe("ViewportCard stage layout", () => {
  it("adds a plain 24px stage while preserving the classic framed default", () => {
    const classic = render(() => <ViewportCard>Classic</ViewportCard>);
    hasClass(classic.container.firstElementChild!, "p-2.5");
    hasClass(classic.container.firstElementChild!.firstElementChild!, "rounded-xl");
    classic.unmount();

    const stage = render(() => (
      <ViewportCard contentClass="flex-none max-w-[720px]" variant="stage">
        Stage
      </ViewportCard>
    ));
    const outer = stage.container.firstElementChild!;
    const content = outer.firstElementChild!;
    hasClass(outer, "p-6");
    hasClass(outer, "items-center");
    expect(content.classList.contains("rounded-xl")).toBe(false);
    hasClass(content, "flex-none");
    hasClass(content, "max-w-[720px]");
  });
});

describe("StageCanvas framing", () => {
  it("renders a muted rounded well and tracked caption for wide and square aspects", () => {
    const wide = render(() => (
      <StageCanvas
        aspect="wide"
        captionLeft="Position 01"
        captionRight="1024 × 768 px"
        class="max-w-[45rem]"
      >
        <div data-testid="wide-child">canvas</div>
      </StageCanvas>
    ));
    const wideRoot = wide.container.firstElementChild!;
    hasClass(wideRoot, "max-w-[45rem]");
    hasClass(wideRoot, "gap-3");
    const wideWell = wideRoot.firstElementChild!;
    hasClass(wideWell, "rounded-2xl");
    hasClass(wideWell, "bg-muted");
    hasClass(wideWell, "aspect-[12/7]");
    expect(screen.getByTestId("wide-child")).toBeTruthy();
    expect(screen.getByText("Position 01")).toBeTruthy();
    expect(screen.getByText("1024 × 768 px")).toBeTruthy();
    const caption = wideRoot.lastElementChild!;
    hasClass(caption, "tracking-[0.12em]");
    hasClass(caption, "text-muted-foreground");
    wide.unmount();

    const square = render(() => (
      <StageCanvas
        aspect="square"
        captionLeft="Site 1 · Channel GFP"
        captionRight="No frame"
        class="max-w-[30rem]"
      >
        <div data-testid="square-child">canvas</div>
      </StageCanvas>
    ));
    const squareRoot = square.container.firstElementChild!;
    hasClass(squareRoot, "max-w-[30rem]");
    const squareWell = squareRoot.firstElementChild!;
    hasClass(squareWell, "aspect-square");
    hasClass(squareWell, "rounded-2xl");
    hasClass(squareWell, "bg-muted");
    expect(screen.getByTestId("square-child")).toBeTruthy();
    expect(screen.getByText("Site 1 · Channel GFP")).toBeTruthy();
    expect(screen.getByText("No frame")).toBeTruthy();
  });
});
