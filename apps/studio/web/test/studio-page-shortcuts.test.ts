import { Router, Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Effect, Queue, Schema, Stream } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioNavRail } from "../src/components/studio-nav-rail";
import {
  studioHorizontalHistoryArrow,
  studioPageForShortcut,
  studioPageShortcutPlatform,
  studioPageStepTarget,
} from "../src/navigation/studio-page-shortcuts";
import {
  StudioNavigationMessage,
  StudioNavigationProvider,
  StudioRoute,
  studioRouteForPath,
} from "../src/navigation/studio-router";
import { setStudioAnnotateDirty } from "../src/state/studio-annotate-guard";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  mountTest,
  waitForCondition,
} from "./render-helper";

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

const NavBridgeMsg = UiSchema.TaggedEnum({
  Push: { to: Schema.String },
});

function createNavHarness(
  initial: (typeof pages)[number],
  options: { readonly persistentRail?: boolean } = {},
) {
  let currentPath: string = initial;
  let emitPush: ((to: string) => void) | null = null;

  const NavBridge = Html.component({
    name: "StudioNavShortcutsBridge",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: NavBridgeMsg,
    reads: {
      nav: StudioNavigationProvider,
    },
  }).make({
    init: () => ({}),
    update: {
      Push: ($, { to }) =>
        $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to })),
    },
    subscriptions: () => [
      Subscription.make("studio-nav-test-bridge", "mounted", () =>
        Stream.callback<typeof NavBridgeMsg.Type>((queue) => {
          emitPush = (to: string) => {
            Queue.offerUnsafe(queue, NavBridgeMsg.Push({ to }));
          };
          return Effect.addFinalizer(() =>
            Effect.sync(() => {
              emitPush = null;
            }),
          );
        }),
      ),
    ],
    view: () => View.text(""),
  });

  const Host = Html.component({
    name: "StudioNavShortcutsHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Schema.Never,
  }).make({
    init: () => ({}),
    update: {},
    view: (h) =>
      StudioNavigationProvider(h, {
        key: "nav-provider",
        props: { initialRoute: studioRouteForPath(initial) },
        view: (nav) => {
          currentPath = nav.pathname;
          return h.div.children(
            NavBridge(h, { key: "bridge", props: {} }),
            StudioNavRail(h, {
              key: options.persistentRail ? "persistent-rail" : `rail-${nav.pathname}`,
            }),
            h.input.attr("aria-label", "Assay name"),
          );
        },
      }),
  });

  return {
    Host,
    pathname: () => currentPath,
    navigate: async (to: (typeof pages)[number]) => {
      emitPush?.(to);
      await waitForCondition(() => currentPath === to);
      await flushMicrotasks();
    },
  };
}

async function renderNav(
  initial: (typeof pages)[number],
  options: { readonly persistentRail?: boolean } = {},
) {
  const harness = createNavHarness(initial, options);
  const mounted = await mountTest(
    harness.Host as any,
    {},
    {
      layer: Router.memory({ routes: StudioRoute, url: initial }) as any,
    },
  );
  await flushMicrotasks();
  return {
    container: mounted.container,
    pathname: harness.pathname,
    navigate: harness.navigate,
  };
}

function findPrimaryNav(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('nav[aria-label="Primary"]');
}

function findLinkByLabel(container: HTMLElement, label: string): HTMLAnchorElement {
  const link = Array.from(container.querySelectorAll<HTMLAnchorElement>("a")).find((a) =>
    (a.textContent ?? "").includes(label),
  );
  if (!link) {
    throw new Error(`Link "${label}" not found`);
  }
  return link;
}

function keydown(key: string, init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
}

describe("StudioNavRail page shortcuts", () => {
  afterEach(async () => {
    await cleanupMounted();
    setStudioAnnotateDirty(false);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta", bubbles: true }));
  });

  it("animates from the previous step when navigation mounts a new sidebar", async () => {
    const originalAnimate = HTMLElement.prototype.animate;
    const animate = vi.fn().mockReturnValue({ cancel: vi.fn() });
    HTMLElement.prototype.animate = animate;
    try {
      const { container } = await renderNav("/assay");
      const firstRail = await waitForCondition(() => findPrimaryNav(container));
      animate.mockClear();
      clickElement(findLinkByLabel(container, "Align"));
      await waitForCondition(() => {
        const alignLink = findLinkByLabel(container, "Align");
        const nextRail = findPrimaryNav(container);
        return alignLink.getAttribute("aria-current") === "page" && nextRail !== firstRail;
      });
      await waitForCondition(() => animate.mock.calls.length > 0);
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
    const { container } = await renderNav("/assay", { persistentRail: true });
    const rail = await waitForCondition(() => findPrimaryNav(container));
    const stepWindow = rail.querySelector('[data-slot="studio-step-window"]')!;
    const track = rail.querySelector<HTMLElement>('[data-slot="studio-step-track"]')!;
    const windowStyle = stepWindow.getAttribute("class");
    expect(rail.querySelectorAll("a")).toHaveLength(5);
    expect(track.style.transform).toBe("translateY(0rem)");
    expect(findLinkByLabel(container, "Assay").getAttribute("aria-current")).toBe("page");

    const selectStep = async (label: string, offset: string) => {
      clickElement(findLinkByLabel(container, label));
      await waitForCondition(
        () =>
          findLinkByLabel(container, label).getAttribute("aria-current") === "page" &&
          track.style.transform === `translateY(${offset})`,
      );
      expect(rail.querySelector('[data-slot="studio-step-window"]')).toBe(stepWindow);
      expect(stepWindow.getAttribute("class")).toBe(windowStyle);
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
    const { container, pathname, navigate } = await renderNav("/assay");
    const rail = await waitForCondition(() => findPrimaryNav(container));
    const metadata = findLinkByLabel(container, "Metadata");
    const numberHint = platform === "mac" ? "⌘2" : "Ctrl+2";
    const upHint = platform === "mac" ? "⌘↑" : "Ctrl+↑";
    const downHint = platform === "mac" ? "⌘↓" : "Ctrl+↓";
    expect(metadata.getAttribute("aria-keyshortcuts")).toBe(shortcutLabel);
    expect(metadata.textContent).not.toContain(numberHint);
    expect(rail.textContent).not.toContain(upHint);
    expect(rail.textContent).not.toContain(downHint);

    keydown(platform === "mac" ? "Meta" : "Control", chord);
    await waitForCondition(() =>
      (findLinkByLabel(container, "Metadata").textContent ?? "").includes(numberHint),
    );
    const activeRail = findPrimaryNav(container)!;
    const activeMetadata = findLinkByLabel(container, "Metadata");
    expect(activeMetadata.textContent).toContain(numberHint);
    expect(activeMetadata.textContent).not.toContain(upHint);
    expect(activeMetadata.textContent).not.toContain(downHint);
    expect(activeRail.textContent?.startsWith(upHint)).toBe(true);
    expect(activeRail.textContent?.endsWith(downHint)).toBe(true);

    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta", bubbles: true }));
    await waitForCondition(
      () => !(findLinkByLabel(container, "Metadata").textContent ?? "").includes(numberHint),
    );
    expect(findPrimaryNav(container)?.textContent).not.toContain(upHint);

    keydown("2", chord);
    await waitForCondition(() => pathname() === "/metadata");
    await flushMicrotasks();

    keydown("3", other);
    await flushMicrotasks();
    expect(pathname()).toBe("/metadata");

    const input = container.querySelector<HTMLInputElement>('input[aria-label="Assay name"]')!;
    input.focus();
    keydown("5", chord);
    await waitForCondition(() => pathname() === "/analysis");
    await flushMicrotasks();

    keydown("1", { ...chord, repeat: true });
    await flushMicrotasks();
    expect(pathname()).toBe("/analysis");

    await navigate("/annotate");
    setStudioAnnotateDirty(true);
    const confirmMock = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", confirmMock);
    keydown("1", chord);
    await flushMicrotasks();
    expect(pathname()).toBe("/annotate");

    confirmMock.mockReturnValue(true);
    keydown("1", chord);
    await waitForCondition(() => pathname() === "/assay");
  });

  it("moves up and down the rail and ignores horizontal history arrows", async () => {
    const platform = studioPageShortcutPlatform();
    const chord = platform === "mac" ? { metaKey: true } : { ctrlKey: true };
    const { container, pathname, navigate } = await renderNav("/metadata");
    await waitForCondition(() => findPrimaryNav(container));

    keydown("ArrowDown", chord);
    await waitForCondition(() => pathname() === "/align");
    await flushMicrotasks();

    keydown("ArrowUp", chord);
    await waitForCondition(() => pathname() === "/metadata");
    await flushMicrotasks();

    keydown("ArrowLeft", chord);
    keydown("ArrowRight", chord);
    await flushMicrotasks();
    expect(pathname()).toBe("/metadata");

    await navigate("/assay");
    keydown("ArrowUp", chord);
    await flushMicrotasks();
    expect(pathname()).toBe("/assay");
  });
});

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
