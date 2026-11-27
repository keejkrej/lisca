import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { PathButton } from "@lisca/ui/patterns";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AlignToolToolbar } from "../src/align/align-tools";
import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
} from "../src/annotate/annotation-tool-grid";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  keyDownElement,
  mountTest,
  waitForCondition,
} from "./render-helper";

afterEach(cleanupMounted);

function findButtonByAriaLabel(root: ParentNode, label: string): HTMLButtonElement | null {
  return root.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null;
}

describe("stage rail tool compatibility", () => {
  it("renders five align actions with Magnifier last and maps their displayed shortcuts", async () => {
    const onModeChange = vi.fn();
    const Msg = UiSchema.TaggedEnum({ Mode: { mode: Schema.String } });

    const Host = Html.component({
      name: "AlignToolbarShortcutsHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: {
        Mode: ($, { mode }) => {
          onModeChange(mode);
          return $.model;
        },
      },
      view: (h) =>
        AlignToolToolbar(h, {
          layout: "rail",
          mode: "pan",
          shortcutsEnabled: true,
          onModeChange: (mode) => Msg.Mode({ mode }),
        }),
    });

    const { container } = await mountTest(Host, {});
    await flushMicrotasks();

    const toolbar = container.querySelector('[role="toolbar"][aria-label="Align canvas tool"]')!;
    expect(toolbar).not.toBeNull();

    const expected = [
      { key: "1", label: "Pan", mode: "pan" },
      { key: "2", label: "Rotate", mode: "rotate" },
      { key: "3", label: "Zoom spacing", mode: "zoom-spacing" },
      { key: "4", label: "Zoom pattern", mode: "zoom-pattern" },
      { key: "5", label: "Magnifier", mode: "magnifier" },
    ] as const;

    expect(toolbar.children).toHaveLength(5);
    for (const action of expected) {
      const button = findButtonByAriaLabel(toolbar, `${action.label} (${action.key})`)!;
      expect(button).not.toBeNull();
      expect(button.textContent).toContain(action.label);
      const shortcut = button.querySelector("kbd");
      expect(shortcut?.textContent).toBe(action.key);
      expect(shortcut?.nextElementSibling?.textContent).toBe(action.label);

      keyDownElement(document, action.key);
      await flushMicrotasks();
      expect(onModeChange).toHaveBeenLastCalledWith(action.mode);
    }
    expect(onModeChange).toHaveBeenCalledTimes(5);
  });

  it("renders independent 32px spacing and pattern zoom locks", async () => {
    const onSpacingZoomLockedChange = vi.fn();
    const onPatternZoomLockedChange = vi.fn();
    const Msg = UiSchema.TaggedEnum({
      Noop: {},
      SpacingLock: { locked: Schema.Boolean },
      PatternLock: { locked: Schema.Boolean },
    });

    const makeHost = (layout?: "grid" | "rail") =>
      Html.component({
        name: `AlignZoomLocksHost-${layout ?? "grid"}`,
        props: Schema.Struct({}),
        model: Schema.Struct({}),
        message: Msg,
      }).make({
        init: () => ({}),
        update: {
          Noop: ($) => $.model,
          SpacingLock: ($, { locked }) => {
            onSpacingZoomLockedChange(locked);
            return $.model;
          },
          PatternLock: ($, { locked }) => {
            onPatternZoomLockedChange(locked);
            return $.model;
          },
        },
        view: (h) =>
          AlignToolToolbar(h, {
            layout,
            mode: "pan",
            patternZoomLocked: false,
            spacingZoomLocked: true,
            onModeChange: () => Msg.Noop(),
            onPatternZoomLockedChange: (locked) => Msg.PatternLock({ locked }),
            onSpacingZoomLockedChange: (locked) => Msg.SpacingLock({ locked }),
          }),
      });

    const rail = await mountTest(makeHost("rail"), {});
    const spacingLock = findButtonByAriaLabel(rail.container, "Unlock spacing zoom")!;
    const patternLock = findButtonByAriaLabel(rail.container, "Lock pattern zoom")!;
    expect(spacingLock.className).toContain("size-8");
    expect(patternLock.className).toContain("size-8");
    expect(spacingLock.title).toBe("Unlock spacing zoom");
    expect(patternLock.title).toBe("Lock pattern zoom");
    expect(spacingLock.querySelector("svg")).not.toBeNull();
    expect(patternLock.querySelector("svg")).not.toBeNull();

    clickElement(spacingLock);
    clickElement(patternLock);
    await flushMicrotasks();
    expect(onSpacingZoomLockedChange).toHaveBeenCalledWith(false);
    expect(onPatternZoomLockedChange).toHaveBeenCalledWith(true);

    await rail.unmount();

    const grid = await mountTest(makeHost(undefined), {});
    expect(findButtonByAriaLabel(grid.container, "Unlock spacing zoom")!.className).toContain(
      "size-8",
    );
    expect(findButtonByAriaLabel(grid.container, "Lock pattern zoom")!.className).toContain(
      "size-8",
    );
  });

  it("shows Magnifier last as annotation shortcut 5 and retains all grid actions", async () => {
    const actions = buildAnnotationToolActions("brush", vi.fn(), false);

    const RailHost = Html.component({
      name: "AnnotateToolRailHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: {},
      view: (h) =>
        AnnotationToolGrid(h, {
          canEditTools: true,
          layout: "rail",
          shortcutsEnabled: true,
          toolActions: actions,
        }),
    });

    const rail = await mountTest(RailHost, {});
    const railToolbar = rail.container.querySelector(
      '[role="toolbar"][aria-label="Annotation tool"]',
    )!;
    expect(railToolbar.children).toHaveLength(5);
    for (const [index, label] of ["Brush", "Lasso", "Smart", "Erase", "Magnifier"].entries()) {
      const button = findButtonByAriaLabel(railToolbar, `${label} (${index + 1})`)!;
      expect(button).not.toBeNull();
      const shortcut = button.querySelector("kbd");
      expect(shortcut?.textContent).toBe(String(index + 1));
      expect(shortcut?.nextElementSibling?.textContent).toBe(label);
    }
    await rail.unmount();

    const GridHost = Html.component({
      name: "AnnotateToolGridHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: {},
      view: (h) => AnnotationToolGrid(h, { canEditTools: true, toolActions: actions }),
    });

    const grid = await mountTest(GridHost, {});
    const gridToolbar = grid.container.querySelector(
      '[role="toolbar"][aria-label="Annotation tool"]',
    )!;
    expect(gridToolbar.querySelectorAll("button")).toHaveLength(7);
    expect(findButtonByAriaLabel(gridToolbar, "Brush (1)")).toBeTruthy();
    expect(findButtonByAriaLabel(gridToolbar, "Smart Erase (6)")).toBeTruthy();
    expect(findButtonByAriaLabel(gridToolbar, "Magnifier (7)")?.querySelector("svg")).toBeTruthy();
  });

  it("keeps Smart and Smart Erase enabled and selectable via click and shortcut keys", async () => {
    const onToolChange = vi.fn();
    const actions = buildAnnotationToolActions("brush", onToolChange, false);

    const makeHost = (layout?: "rail" | "grid") =>
      Html.component({
        name: `AnnotateSmartHost-${layout ?? "grid"}`,
        props: Schema.Struct({}),
        model: Schema.Struct({}),
        message: Schema.Never,
      }).make({
        init: () => ({}),
        update: {},
        view: (h) =>
          AnnotationToolGrid(h, {
            canEditTools: true,
            layout,
            shortcutsEnabled: true,
            toolActions: actions,
          }),
      });

    const rail = await mountTest(makeHost("rail"), {});
    await flushMicrotasks();

    const smart = findButtonByAriaLabel(rail.container, "Smart (3)")!;
    expect(smart.disabled).toBe(false);
    expect(smart.textContent).not.toContain("Version 1.0");
    expect(smart.closest("[data-slot='tooltip-trigger']")).toBeNull();
    clickElement(smart);
    await flushMicrotasks();
    expect(onToolChange).toHaveBeenCalledWith("smart");
    onToolChange.mockClear();
    keyDownElement(document, "3");
    await flushMicrotasks();
    expect(onToolChange).toHaveBeenCalledWith("smart");
    await rail.unmount();

    onToolChange.mockClear();
    const grid = await mountTest(makeHost(undefined), {});
    await flushMicrotasks();
    const smartErase = findButtonByAriaLabel(grid.container, "Smart Erase (6)")!;
    expect(smartErase.disabled).toBe(false);
    expect(smartErase.textContent).not.toContain("Version 1.0");
    clickElement(smartErase);
    await flushMicrotasks();
    expect(onToolChange).toHaveBeenCalledWith("smart-erase");
    onToolChange.mockClear();
    keyDownElement(document, "6");
    await flushMicrotasks();
    expect(onToolChange).toHaveBeenCalledWith("smart-erase");
  });

  it("keeps tool numbers visible while shortcut keys are disabled", async () => {
    const onToolChange = vi.fn();
    const actions = buildAnnotationToolActions("brush", onToolChange, false);

    const Host = Html.component({
      name: "AnnotateToolNoShortcutsHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: {},
      view: (h) =>
        AnnotationToolGrid(h, {
          canEditTools: true,
          layout: "rail",
          shortcutsEnabled: false,
          toolActions: actions,
        }),
    });

    const { container } = await mountTest(Host, {});
    await flushMicrotasks();

    const toolbar = container.querySelector('[role="toolbar"][aria-label="Annotation tool"]')!;
    expect(findButtonByAriaLabel(toolbar, "Brush (1)")?.querySelector("kbd")?.textContent).toBe(
      "1",
    );
    keyDownElement(document, "2");
    await flushMicrotasks();
    expect(onToolChange).not.toHaveBeenCalled();
  });

  it("keeps Magnifier available when annotation editing actions are disabled", async () => {
    const onToolChange = vi.fn();
    const actions = buildAnnotationToolActions("brush", onToolChange, true, { viewable: true });

    const Host = Html.component({
      name: "AnnotateToolMagnifierOnlyHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: {},
      view: (h) =>
        AnnotationToolGrid(h, {
          canEditTools: false,
          layout: "rail",
          toolActions: actions,
        }),
    });

    const { container } = await mountTest(Host, {});
    await flushMicrotasks();

    expect(findButtonByAriaLabel(container, "Brush (1)")!.disabled).toBe(true);
    const magnifier = findButtonByAriaLabel(container, "Magnifier (5)")!;
    expect(magnifier.disabled).toBe(false);
    keyDownElement(document, "5");
    await flushMicrotasks();
    expect(onToolChange).toHaveBeenLastCalledWith("magnifier");
    clickElement(magnifier);
    await flushMicrotasks();
    expect(onToolChange).toHaveBeenCalledTimes(2);
  });

  it("reacts to toolbar layout and mode changes without rebuilding stable grid buttons", async () => {
    const Msg = UiSchema.TaggedEnum({
      Noop: {},
      SetLayout: { layout: Schema.Literals(["grid", "rail"]) },
      SetMode: { mode: Schema.Literals(["pan", "rotate"]) },
    });

    const Host = Html.component({
      name: "AlignToolbarReactiveHost",
      props: Schema.Struct({}),
      model: Schema.Struct({
        layout: Schema.Literals(["grid", "rail"]),
        mode: Schema.Literals(["pan", "rotate"]),
      }),
      message: Msg,
    }).make({
      init: () => ({ layout: "grid" as const, mode: "pan" as const }),
      update: {
        Noop: ($) => $.model,
        SetLayout: ($, { layout }) => $.evolve({ layout }),
        SetMode: ($, { mode }) => $.evolve({ mode }),
      },
      view: (h, model) =>
        AlignToolToolbar(h, {
          layout: model.layout,
          mode: model.mode,
          onModeChange: () => Msg.Noop(),
        }),
    });

    const { container, root } = await mountTest(Host, {});

    const panButton = findButtonByAriaLabel(container, "Pan (1)")!;
    expect(
      (container.querySelector('[role="toolbar"][aria-label="Align canvas tool"]') as HTMLElement)
        .dataset.railLayout,
    ).toBeUndefined();

    root.send(Msg.SetMode({ mode: "rotate" }));
    await flushMicrotasks();
    expect(findButtonByAriaLabel(container, "Pan (1)")).toBe(panButton);
    expect(findButtonByAriaLabel(container, "Rotate (2)")!.className).toContain(
      "z-button-variant-default",
    );

    root.send(Msg.SetLayout({ layout: "rail" }));
    await flushMicrotasks();
    expect(
      (container.querySelector('[role="toolbar"][aria-label="Align canvas tool"]') as HTMLElement)
        .dataset.railLayout,
    ).toBe("stack");
  });
});

describe("PathButton stage compatibility", () => {
  it("renders the stage label and reveals the full path on hover, while the classic variant stays on the basename", async () => {
    const Msg = UiSchema.TaggedEnum({ Press: {} });

    const Host = Html.component({
      name: "PathButtonStageHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: { Press: ($) => $.model },
      view: (h) =>
        h.div.children(
          PathButton(h, {
            appearance: "stage",
            icon: h.el("svg").attr("data-testid", "unused-stage-icon"),
            label: "Source",
            preserveExtension: true,
            value: "/workspaces/plate-01/source-image.nd2",
            onPress: Msg.Press(),
          }),
          PathButton(h, {
            icon: h.el("svg").attr("aria-hidden", "true").attr("data-testid", "classic-path-icon"),
            label: "Source",
            value: "/workspaces/plate-01/source-image.nd2",
            onPress: Msg.Press(),
          }),
        ),
    });

    const { container } = await mountTest(Host, {});

    const stage = findButtonByAriaLabel(
      container,
      "Source: /workspaces/plate-01/source-image.nd2",
    )!;
    expect(stage).not.toBeNull();
    expect(stage.textContent).toBe("Source");
    expect(stage.className).toContain("z-button-variant-outline");
    expect(stage.className).not.toContain("z-button-variant-ghost");
    expect(stage.textContent).not.toContain("source-image");
    expect(stage.textContent).not.toContain(".nd2");
    expect(stage.querySelector("span")?.className).toContain("text-foreground");
    expect(stage.querySelector("span")?.className).not.toContain("text-muted-foreground");
    expect(container.querySelector('[data-testid="unused-stage-icon"]')).toBeNull();

    stage.dispatchEvent(new PointerEvent("pointerenter", { bubbles: false, pointerType: "mouse" }));
    stage.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    await waitForCondition(() =>
      document.body.textContent?.includes("/workspaces/plate-01/source-image.nd2"),
    );

    const classic = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "source-image",
    )!;
    expect(classic).toBeTruthy();
    expect(classic.querySelector('[data-testid="classic-path-icon"]')).toBeTruthy();
    expect(classic.textContent).toBe("source-image");
    expect(classic.textContent).not.toContain(".nd2");
  });

  it("keeps an unset stage path the same color and shows the pick prompt on hover", async () => {
    const Msg = UiSchema.TaggedEnum({ Press: {} });

    const Host = Html.component({
      name: "PathButtonUnsetHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: { Press: ($) => $.model },
      view: (h) =>
        PathButton(h, {
          appearance: "stage",
          label: "Workspace",
          value: null,
          onPress: Msg.Press(),
        }),
    });

    const { container } = await mountTest(Host, {});

    const trigger = findButtonByAriaLabel(container, "Workspace: not set")!;
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toBe("Workspace");
    expect(trigger.textContent).not.toContain("Not set");
    expect(trigger.querySelector("span")?.className).toContain("text-foreground");
    expect(trigger.querySelector("span")?.className).not.toContain("text-muted-foreground");

    trigger.dispatchEvent(
      new PointerEvent("pointerenter", { bubbles: false, pointerType: "mouse" }),
    );
    trigger.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    await waitForCondition(() => document.body.textContent?.includes("Pick a workspace folder"));
  });
});
