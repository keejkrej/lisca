import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/solid-router";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioNavRail } from "../src/components/studio-nav-rail";
import {
  studioHorizontalHistoryArrow,
  studioPageForShortcut,
  studioPageShortcutPlatform,
  studioPageStepTarget,
} from "../src/navigation/studio-page-shortcuts";
import { setStudioAnnotateDirty } from "../src/state/studio-annotate-guard";

const baseContext = {
  editableTarget: false,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};

describe("studio page shortcuts", () => {
  it("uses Command on macOS and Control elsewhere", () => {
    expect(studioPageShortcutPlatform("MacIntel")).toBe("mac");
    expect(studioPageShortcutPlatform("Win32")).toBe("other");
    expect(studioPageShortcutPlatform("Linux x86_64")).toBe("other");
  });

  it("maps Command+1 through Command+5 on macOS", () => {
    expect(studioPageForShortcut({ ...baseContext, key: "1", metaKey: true }, "mac")).toBe(
      "/assay",
    );
    expect(studioPageForShortcut({ ...baseContext, key: "2", metaKey: true }, "mac")).toBe(
      "/metadata",
    );
    expect(studioPageForShortcut({ ...baseContext, key: "5", metaKey: true }, "mac")).toBe(
      "/analysis",
    );
    expect(studioPageForShortcut({ ...baseContext, key: "2", ctrlKey: true }, "mac")).toBeNull();
    expect(studioPageForShortcut({ ...baseContext, key: "2" }, "mac")).toBeNull();
    expect(
      studioPageForShortcut({ ...baseContext, key: "2", metaKey: true, shiftKey: true }, "mac"),
    ).toBeNull();
  });

  it("maps Control+1 through Control+5 on Windows", () => {
    expect(studioPageForShortcut({ ...baseContext, key: "3", ctrlKey: true }, "other")).toBe(
      "/align",
    );
    expect(studioPageForShortcut({ ...baseContext, key: "4", ctrlKey: true }, "other")).toBe(
      "/annotate",
    );
    expect(studioPageForShortcut({ ...baseContext, key: "4", metaKey: true }, "other")).toBeNull();
  });

  it("steps the rail with Command+Up and Command+Down", () => {
    expect(
      studioPageStepTarget({ ...baseContext, key: "ArrowDown", metaKey: true }, "mac", "/assay"),
    ).toEqual({ to: "/metadata" });
    expect(
      studioPageStepTarget({ ...baseContext, key: "ArrowUp", metaKey: true }, "mac", "/align"),
    ).toEqual({ to: "/metadata" });
    expect(
      studioPageStepTarget({ ...baseContext, key: "ArrowUp", metaKey: true }, "mac", "/assay"),
    ).toEqual({ to: null });
    expect(
      studioPageStepTarget(
        { ...baseContext, key: "ArrowDown", ctrlKey: true },
        "other",
        "/annotate",
      ),
    ).toEqual({ to: "/analysis" });
    expect(
      studioPageStepTarget({ ...baseContext, key: "ArrowDown", ctrlKey: true }, "mac", "/assay"),
    ).toBeNull();
    expect(
      studioPageStepTarget({ ...baseContext, key: "ArrowLeft", metaKey: true }, "mac", "/align"),
    ).toBeNull();
  });

  it("recognizes Command+Left and Command+Right outside a text field", () => {
    expect(
      studioHorizontalHistoryArrow({ ...baseContext, key: "ArrowLeft", metaKey: true }, "mac"),
    ).toBe(true);
    expect(
      studioHorizontalHistoryArrow(
        { ...baseContext, key: "ArrowRight", metaKey: true, editableTarget: true },
        "mac",
      ),
    ).toBe(false);
    expect(
      studioHorizontalHistoryArrow({ ...baseContext, key: "ArrowLeft", ctrlKey: true }, "mac"),
    ).toBe(false);
  });

  it("still matches while an editable field is focused", () => {
    expect(
      studioPageForShortcut(
        { ...baseContext, key: "2", metaKey: true, editableTarget: true },
        "mac",
      ),
    ).toBe("/metadata");
  });
});

const pages = ["/assay", "/metadata", "/align", "/annotate", "/analysis"] as const;

function renderNav(initial: (typeof pages)[number]) {
  const rootRoute = createRootRoute();
  const routes = pages.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => (
        <div>
          <StudioNavRail />
          <input aria-label="Assay name" />
        </div>
      ),
    }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [initial] }),
  });
  render(() => <RouterProvider router={router} />);
  return router;
}

function keydown(key: string, init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
}

describe("StudioNavRail page shortcuts", () => {
  afterEach(() => {
    cleanup();
    setStudioAnnotateDirty(false);
    vi.restoreAllMocks();
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta", bubbles: true }));
  });

  it("animates from the previous step when navigation mounts a new sidebar", async () => {
    const originalAnimate = HTMLElement.prototype.animate;
    const animate = vi.fn().mockReturnValue({ cancel: vi.fn() });
    HTMLElement.prototype.animate = animate;
    try {
      renderNav("/assay");
      const firstRail = await screen.findByRole("navigation", { name: "Primary" });
      animate.mockClear();
      fireEvent.click(screen.getByRole("link", { name: "Align" }));
      await waitFor(() => {
        expect(screen.getByRole("link", { name: "Align" }).getAttribute("aria-current")).toBe(
          "page",
        );
        expect(screen.getByRole("navigation", { name: "Primary" })).not.toBe(firstRail);
      });
      expect(animate).toHaveBeenLastCalledWith(
        [{ transform: "translateY(0rem)" }, { transform: "translateY(-5rem)" }],
        { duration: 300, easing: "ease-in-out" },
      );
    } finally {
      if (originalAnimate) HTMLElement.prototype.animate = originalAnimate;
      else Reflect.deleteProperty(HTMLElement.prototype, "animate");
    }
  });

  it("moves the step labels through one fixed window when navigating in either direction", async () => {
    const rootRoute = createRootRoute({ component: StudioNavRail });
    const router = createRouter({
      routeTree: rootRoute.addChildren(
        pages.map((path) => createRoute({ getParentRoute: () => rootRoute, path })),
      ),
      history: createMemoryHistory({ initialEntries: ["/assay"] }),
    });
    render(() => <RouterProvider router={router} />);
    const rail = await screen.findByRole("navigation", { name: "Primary" });
    const window = rail.querySelector('[data-slot="studio-step-window"]')!;
    const track = rail.querySelector<HTMLElement>('[data-slot="studio-step-track"]')!;
    const windowStyle = window.getAttribute("class");
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(track.style.transform).toBe("translateY(0rem)");
    expect(screen.getByRole("link", { name: "Assay" }).getAttribute("aria-current")).toBe("page");

    const selectStep = async (label: string, offset: string) => {
      fireEvent.click(screen.getByRole("link", { name: label }));
      await waitFor(() => {
        expect(screen.getByRole("link", { name: label }).getAttribute("aria-current")).toBe("page");
        expect(track.style.transform).toBe(`translateY(${offset})`);
      });
      expect(rail.querySelector('[data-slot="studio-step-window"]')).toBe(window);
      expect(window.getAttribute("class")).toBe(windowStyle);
      expect(rail.querySelector('[data-slot="studio-step-track"]')).toBe(track);
      expect(rail.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    };
    await selectStep("Analysis", "-10rem");
    await selectStep("Metadata", "-2.5rem");
  });

  it("switches pages with the platform chord and ignores the other modifier, repeats, and a cancelled annotate leave", async () => {
    const platform = studioPageShortcutPlatform();
    const chord = platform === "mac" ? { metaKey: true } : { ctrlKey: true };
    const other = platform === "mac" ? { ctrlKey: true } : { metaKey: true };
    const shortcutLabel = platform === "mac" ? "Meta+2" : "Control+2";
    const router = renderNav("/assay");
    expect(await screen.findByRole("navigation", { name: "Primary" })).toBeTruthy();
    const metadata = screen.getByRole("link", { name: "Metadata" });
    const numberHint = platform === "mac" ? "⌘2" : "Ctrl+2";
    const upHint = platform === "mac" ? "⌘↑" : "Ctrl+↑";
    const downHint = platform === "mac" ? "⌘↓" : "Ctrl+↓";
    const rail = screen.getByRole("navigation", { name: "Primary" });
    expect(metadata.getAttribute("aria-keyshortcuts")).toBe(shortcutLabel);
    expect(metadata.textContent).not.toContain(numberHint);
    expect(rail.textContent).not.toContain(upHint);
    expect(rail.textContent).not.toContain(downHint);

    keydown(platform === "mac" ? "Meta" : "Control", chord);
    expect(metadata.textContent).toContain(numberHint);
    expect(metadata.textContent).not.toContain(upHint);
    expect(metadata.textContent).not.toContain(downHint);
    expect(rail.textContent?.startsWith(upHint)).toBe(true);
    expect(rail.textContent?.endsWith(downHint)).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta", bubbles: true }));
    expect(metadata.textContent).not.toContain(numberHint);
    expect(rail.textContent).not.toContain(upHint);

    keydown("2", chord);
    await waitFor(() => expect(router.state.location.pathname).toBe("/metadata"));

    keydown("3", other);
    expect(router.state.location.pathname).toBe("/metadata");

    screen.getByRole("textbox", { name: "Assay name" }).focus();
    keydown("5", chord);
    await waitFor(() => expect(router.state.location.pathname).toBe("/analysis"));

    keydown("1", { ...chord, repeat: true });
    expect(router.state.location.pathname).toBe("/analysis");

    await router.navigate({ to: "/annotate" });
    setStudioAnnotateDirty(true);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    keydown("1", chord);
    expect(router.state.location.pathname).toBe("/annotate");

    vi.mocked(window.confirm).mockReturnValue(true);
    keydown("1", chord);
    await waitFor(() => expect(router.state.location.pathname).toBe("/assay"));
  });

  it("moves up and down the rail and ignores horizontal history arrows", async () => {
    const platform = studioPageShortcutPlatform();
    const chord = platform === "mac" ? { metaKey: true } : { ctrlKey: true };
    const router = renderNav("/metadata");
    expect(await screen.findByRole("navigation", { name: "Primary" })).toBeTruthy();

    keydown("ArrowDown", chord);
    await waitFor(() => expect(router.state.location.pathname).toBe("/align"));

    keydown("ArrowUp", chord);
    await waitFor(() => expect(router.state.location.pathname).toBe("/metadata"));

    keydown("ArrowLeft", chord);
    keydown("ArrowRight", chord);
    expect(router.state.location.pathname).toBe("/metadata");

    await router.navigate({ to: "/assay" });
    keydown("ArrowUp", chord);
    expect(router.state.location.pathname).toBe("/assay");
  });
});

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
