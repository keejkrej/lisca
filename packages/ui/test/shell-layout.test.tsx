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

function stageTopBar(): Element {
  const element = document.querySelector('[data-slot="app-shell-top-bar"]');
  expect(element).not.toBeNull();
  return element!;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AppShell paper pane", () => {
  it("renders the paper-pane geometry without clipping its central shadows", () => {
    stubViewport(1440, 900);
    const view = render(() => (
      <AppShell>
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
    hasClass(root, "bg-muted");
    hasClass(root, "py-4");
    hasClass(root, "overflow-clip");
    hasClass(screen.getByLabelText("Left panel"), "w-64");
    expect(screen.getByLabelText("Left panel").classList.contains("border-r")).toBe(false);
    hasClass(screen.getByLabelText("Right panel"), "w-64");
    hasClass(mainColumn, "gap-3");
    hasClass(mainColumn, "overflow-visible");
    hasClass(topBar, "h-14");
    hasClass(topBar, "px-5");
    hasClass(topBar, "rounded-2xl");
    hasClass(main, "rounded-2xl");
    hasClass(main, "overflow-clip");
    expect(root.getAttribute("data-variant")).toBeNull();
  });

  it("updates a sidebar width class passed from reactive state", () => {
    stubViewport(1200, 800);
    const [widthClass, setWidthClass] = createSignal("w-64");
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
    hasClass(sidebar, "w-64");
    setWidthClass("w-72");
    expect(screen.getByLabelText("Left panel")).toBe(sidebar);
    hasClass(sidebar, "w-72");
  });

  it("keeps a document scrollbar at the full main-sheet edge", () => {
    stubViewport(1440, 900);
    render(() => (
      <AppShell>
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
    const scroll = main.querySelector('[data-slot="app-shell-main-scroll"]');
    const content = scroll?.firstElementChild;
    expect(scroll).not.toBeNull();
    expect(scroll?.parentElement).toBe(main);
    hasClass(scroll!, "w-full");
    hasClass(scroll!, "overflow-y-auto");
    expect(content).not.toBeNull();
    hasClass(content!, "mx-auto");
    hasClass(content!, "min-h-full");
    hasClass(content!, "max-w-[52rem]");
    expect(content!.classList.contains("overflow-y-auto")).toBe(false);
  });

  it("keeps rails registered as 256px portrait overlays owned by Body", () => {
    stubViewport(600, 900);
    render(() => (
      <AppShell>
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
  ])("uses body-owned overlays at constrained landscape size %ix%i", (width, height) => {
    stubViewport(width, height);
    render(() => (
      <AppShell>
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

  it("moves a mounted rail across the inline threshold without remounting it", () => {
    const viewport = stubViewport(1200, 700);
    const mounted = vi.fn();

    function RailContent() {
      mounted();
      return <button type="button">Persistent rail action</button>;
    }

    render(() => (
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
    expect(screen.getByLabelText("Left panel").hasAttribute("aria-hidden")).toBe(false);

    viewport.resize(900, 700);

    expect(screen.getByLabelText("Left panel").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("button", { name: "Open left panel" })).toBeTruthy();
    expect(mounted).toHaveBeenCalledTimes(1);

    viewport.resize(1200, 700);

    expect(screen.getByLabelText("Left panel").hasAttribute("aria-hidden")).toBe(false);
    expect(screen.queryByRole("button", { name: "Open left panel" })).toBeNull();
    expect(mounted).toHaveBeenCalledTimes(1);
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
});

describe("ViewportCard paper pane", () => {
  it("centers a 24px padded sheet without a nested panel frame", () => {
    const view = render(() => (
      <ViewportCard contentClass="flex-none max-w-[720px]">Canvas</ViewportCard>
    ));
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
