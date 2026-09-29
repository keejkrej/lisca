import { cleanup, render, screen, waitFor } from "@solidjs/testing-library";
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
  studioPageForShortcut,
  studioPageShortcutPlatform,
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
  });

  it("switches pages with the platform chord and ignores the other modifier, repeats, and a cancelled annotate leave", async () => {
    const platform = studioPageShortcutPlatform();
    const chord = platform === "mac" ? { metaKey: true } : { ctrlKey: true };
    const other = platform === "mac" ? { ctrlKey: true } : { metaKey: true };
    const shortcutLabel = platform === "mac" ? "Meta+2" : "Control+2";
    const router = renderNav("/assay");
    expect(await screen.findByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Metadata" }).getAttribute("aria-keyshortcuts")).toBe(
      shortcutLabel,
    );

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
});

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
