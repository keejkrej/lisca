import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { createDefaultAlignGrid } from "@lisca/utils";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { AlignSelectionRail } from "../src/align/align-selection-rail";
import { AlignToolToolbar } from "../src/align/align-tools";
import { AnnotationControlRail } from "../src/annotate/annotation-control-rail";
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
} from "./render-helper";

afterEach(cleanupMounted);

const labelFixtures = [
  { id: "class-1", name: "Class 1", color: "#22c55e" },
  { id: "class-2", name: "Class 2", color: "#3b82f6" },
];

function sectionFor(container: HTMLElement, name: string): HTMLElement {
  const button = Array.from(container.querySelectorAll("button")).find(
    (btn) => btn.textContent?.trim() === name || btn.getAttribute("aria-label") === name,
  );
  const section = button?.closest('[data-slot="panel"]') ?? null;
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

function findButton(root: ParentNode, name: string): HTMLButtonElement | null {
  return (
    (Array.from(root.querySelectorAll("button")).find(
      (btn) =>
        btn.getAttribute("aria-label") === name ||
        btn.textContent?.replace(/⇧\d$/, "").trim() === name ||
        btn.textContent?.trim() === name,
    ) as HTMLButtonElement | undefined) ?? null
  );
}

describe("stage rail feature composition", () => {
  it("packs the Selection task cluster into compact control pairs plus Log-std exclude", async () => {
    const Msg = UiSchema.TaggedEnum({ Noop: {} });
    const Host = Html.component({
      name: "SelectionRailPackHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: { Noop: ($) => $.model },
      view: (h) =>
        AlignSelectionRail(h, {
          excludedPatterns: [],
          frame: null,
          grid: createDefaultAlignGrid(),
          manualExclusionEnabled: false,
          showVariationExcludeDialog: false,
          variationExcludePreview: null,
          visibleCounts: { included: 0, excluded: 0 },
          sectionAppearance: "rail",
          onApplyVariationExclude: Msg.Noop(),
          onCancelVariationExclude: Msg.Noop(),
          onExcludedPatternsChange: () => Msg.Noop(),
          onManualExclusionEnabledChange: () => Msg.Noop(),
          onVariationExclude: Msg.Noop(),
          onVariationExcludeThresholdChange: () => Msg.Noop(),
        }),
    });

    const { container } = await mountTest(Host, {});

    const section = sectionFor(container, "Selection");
    const pairs = Array.from(section.querySelectorAll('[role="group"]'));
    expect(pairs.map((pair) => pair.getAttribute("aria-label"))).toEqual([
      "Selection editing",
      "Bulk exclusion",
    ]);
    expect(
      pairs.map((pair) =>
        Array.from(pair.querySelectorAll("button")).map((button) => button.textContent?.trim()),
      ),
    ).toEqual([
      ["Edit", "Reset"],
      ["Exclude all", "Edge exclude"],
    ]);
    const varExclude = findButton(section, "Log-std exclude")!;
    expect(varExclude).not.toBeNull();
    expect(varExclude.hasAttribute("disabled")).toBe(true);
    expect(findButton(section, "Smart exclude")).toBeNull();
  });

  it("enables Log-std exclude and Smart segment tools when a frame is active", async () => {
    let varExcludeCalls = 0;
    const Msg = UiSchema.TaggedEnum({ Noop: {}, VarExclude: {} });
    const Host = Html.component({
      name: "SelectionRailActiveHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: {
        Noop: ($) => $.model,
        VarExclude: ($) => {
          varExcludeCalls += 1;
          return $.model;
        },
      },
      view: (h) =>
        AlignSelectionRail(h, {
          excludedPatterns: [],
          frame: { width: 256, height: 256 },
          grid: createDefaultAlignGrid(),
          manualExclusionEnabled: false,
          showVariationExcludeDialog: false,
          variationExcludePreview: null,
          visibleCounts: { included: 0, excluded: 0 },
          sectionAppearance: "rail",
          onApplyVariationExclude: Msg.Noop(),
          onCancelVariationExclude: Msg.Noop(),
          onExcludedPatternsChange: () => Msg.Noop(),
          onManualExclusionEnabledChange: () => Msg.Noop(),
          onVariationExclude: Msg.VarExclude(),
          onVariationExcludeThresholdChange: () => Msg.Noop(),
        }),
    });

    const { container } = await mountTest(Host, {});
    const varExclude = findButton(container, "Log-std exclude")!;
    expect(varExclude.hasAttribute("disabled")).toBe(false);
    clickElement(varExclude);
    await flushMicrotasks();
    expect(varExcludeCalls).toBe(1);

    const actions = buildAnnotationToolActions("smart", () => undefined, false);
    expect(actions.find((action) => action.id === "smart")?.disabled).toBe(false);
    expect(actions.find((action) => action.id === "smart-erase")?.disabled).toBe(false);
  });

  it("stacks user-authored Labels while packing fixed Edit peers", async () => {
    const Msg = UiSchema.TaggedEnum({ Noop: {} });
    const Host = Html.component({
      name: "AnnotationRailPackHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: { Noop: ($) => $.model },
      view: (h) =>
        h.div.children(
          AnnotationControlRail(h, {
            activeLabelId: null,
            annotation: {
              current: { classificationLabelId: null, mask: new Uint8Array() },
              dirty: false,
              canUndo: false,
              canRedo: false,
              undo: Msg.Noop(),
              redo: Msg.Noop(),
              discard: Msg.Noop(),
              commit: () => Msg.Noop(),
            },
            brushSize: 8,
            canEdit: true,
            frame: null,
            labels: [],
            mode: "classification",
            openLabelDialog: Msg.Noop(),
            overlayOpacity: 0.65,
            setActiveLabelId: () => Msg.Noop(),
            setBrushSize: () => Msg.Noop(),
            setMode: () => Msg.Noop(),
            setOverlayOpacity: () => Msg.Noop(),
            workspacePath: "/workspace",
            sectionAppearance: "rail",
          }),
        ),
    });

    const { container } = await mountTest(Host, {});

    const mode = sectionFor(container, "Mode");
    expect(mode.querySelectorAll('[data-rail-layout="stack"]')).toHaveLength(1);
    expect(mode.querySelector('[data-rail-layout="stack"]')?.children).toHaveLength(1);
    expect(findButton(mode, "Classification")).toBeTruthy();

    const labels = sectionFor(container, "Labels");
    expect(labels.querySelector('[data-rail-layout="stack"]')).not.toBeNull();
    expect(labels.querySelector('[data-rail-layout="action-pair"]')).toBeNull();
    expect(findButton(labels, "Edit labels")).toBeTruthy();
    expect(labels.textContent).not.toContain("Loading…");

    const edit = sectionFor(container, "Edit");
    const groups = Array.from(edit.querySelectorAll('[role="group"]'));
    expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual([
      "History",
      "Annotation cleanup",
    ]);
    expect(
      groups.flatMap((group) =>
        Array.from(group.querySelectorAll("button")).map((button) => button.textContent?.trim()),
      ),
    ).toEqual(["Undo", "Redo", "Clear", "Discard"]);
  });

  it("keeps shortcut badges on the instrument font in both apps", async () => {
    const Msg = UiSchema.TaggedEnum({ Noop: {} });
    const Host = Html.component({
      name: "ShortcutFontHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: { Noop: ($) => $.model },
      view: (h) =>
        h.div.children(
          AlignToolToolbar(h, { layout: "rail", mode: "pan", onModeChange: () => Msg.Noop() }),
          AnnotationToolGrid(h, {
            canEditTools: true,
            layout: "rail",
            toolActions: buildAnnotationToolActions("brush", () => undefined, false),
          }),
        ),
    });

    const { container } = await mountTest(Host, {});
    const shortcuts = container.querySelectorAll("kbd");
    expect(shortcuts.length).toBeGreaterThan(0);
    expect(
      Array.from(shortcuts).every((shortcut) => shortcut.classList.contains("font-[inherit]")),
    ).toBe(true);
  });

  it("highlights the label clicked in segmentation mode", async () => {
    const Msg = UiSchema.TaggedEnum({
      Noop: {},
      SetActive: { id: Schema.String },
    });
    let latestActive: string | null = "class-1";

    const Host = Html.component({
      name: "SegmentationLabelHost",
      props: Schema.Struct({}),
      model: Schema.Struct({ activeLabelId: Schema.NullOr(Schema.String) }),
      message: Msg,
    }).make({
      init: () => ({ activeLabelId: "class-1" }),
      update: {
        Noop: ($) => $.model,
        SetActive: ($, { id }) => {
          latestActive = id;
          return $.evolve({ activeLabelId: id });
        },
      },
      view: (h, model) =>
        h.div.children(
          AnnotationControlRail(h, {
            activeLabelId: model.activeLabelId,
            annotation: {
              current: { classificationLabelId: null, mask: new Uint8Array() },
              dirty: false,
              canUndo: false,
              canRedo: false,
              undo: Msg.Noop(),
              redo: Msg.Noop(),
              discard: Msg.Noop(),
              commit: () => Msg.Noop(),
            },
            brushSize: 8,
            canEdit: true,
            frame: null,
            labels: labelFixtures,
            mode: "segmentation",
            openLabelDialog: Msg.Noop(),
            overlayOpacity: 0.65,
            setActiveLabelId: (id) => Msg.SetActive({ id }),
            setBrushSize: () => Msg.Noop(),
            setMode: () => Msg.Noop(),
            setOverlayOpacity: () => Msg.Noop(),
            workspacePath: "/workspace",
            sectionAppearance: "rail",
          }),
        ),
    });

    const { container } = await mountTest(Host, {});

    const class2 = findButton(container, "Class 2")!;
    clickElement(class2);
    await flushMicrotasks();

    expect(latestActive).toBe("class-2");
    expect(findButton(container, "Class 1")!.getAttribute("style")).toContain(
      "rgba(34, 197, 94, 0.08)",
    );
    expect(class2.getAttribute("aria-pressed")).toBe("true");
    expect(class2.getAttribute("style")).toContain("rgb(59, 130, 246)");
    expect(class2.getAttribute("style")).toContain("rgb(10, 10, 10)");
    expect(class2.querySelector("svg")).not.toBeNull();
  });

  it("toggles the classification label and shows that choice", async () => {
    const Msg = UiSchema.TaggedEnum({
      Noop: {},
      Commit: { labelId: Schema.NullOr(Schema.String) },
    });
    let latestLabelId: string | null = null;

    const Host = Html.component({
      name: "ClassificationLabelHost",
      props: Schema.Struct({}),
      model: Schema.Struct({ classificationLabelId: Schema.NullOr(Schema.String) }),
      message: Msg,
    }).make({
      init: () => ({ classificationLabelId: null }),
      update: {
        Noop: ($) => $.model,
        Commit: ($, { labelId }) => {
          latestLabelId = labelId;
          return $.evolve({ classificationLabelId: labelId });
        },
      },
      view: (h, model) =>
        h.div.children(
          AnnotationControlRail(h, {
            activeLabelId: null,
            annotation: {
              current: {
                classificationLabelId: model.classificationLabelId,
                mask: new Uint8Array(),
              },
              dirty: false,
              canUndo: false,
              canRedo: false,
              undo: Msg.Noop(),
              redo: Msg.Noop(),
              discard: Msg.Noop(),
              commit: (value) => Msg.Commit({ labelId: value.classificationLabelId }),
            },
            brushSize: 8,
            canEdit: true,
            frame: null,
            labels: labelFixtures,
            mode: "classification",
            openLabelDialog: Msg.Noop(),
            overlayOpacity: 0.65,
            setActiveLabelId: () => Msg.Noop(),
            setBrushSize: () => Msg.Noop(),
            setMode: () => Msg.Noop(),
            setOverlayOpacity: () => Msg.Noop(),
            workspacePath: "/workspace",
            sectionAppearance: "rail",
          }),
        ),
    });

    const { container } = await mountTest(Host, {});
    await flushMicrotasks();

    const class1 = findButton(container, "Class 1")!;
    keyDownElement(window, "!", { code: "Digit1", shiftKey: true });
    await flushMicrotasks();
    expect(latestLabelId).toBe("class-1");

    keyDownElement(window, "!", { code: "Digit1", shiftKey: true });
    await flushMicrotasks();
    expect(latestLabelId).toBeNull();

    clickElement(class1);
    await flushMicrotasks();
    expect(latestLabelId).toBe("class-1");
    expect(class1.getAttribute("aria-pressed")).toBe("true");
    expect(class1.getAttribute("style")).toContain("rgb(34, 197, 94)");
    expect(class1.getAttribute("style")).toContain("rgb(10, 10, 10)");

    clickElement(class1);
    await flushMicrotasks();
    expect(latestLabelId).toBeNull();
    expect(class1.getAttribute("aria-pressed")).toBe("false");
    expect(class1.getAttribute("style")).toContain("rgba(34, 197, 94, 0.08)");
    expect(class1.querySelector("svg")).toBeNull();
  });

  it("toggles labels with Shift+digit and ignores blocked keys", async () => {
    const Msg = UiSchema.TaggedEnum({
      Noop: {},
      SetActive: { id: Schema.String },
      SetCanEdit: { canEdit: Schema.Boolean },
    });
    let latestActive: string | null = null;

    const Host = Html.component({
      name: "LabelShortcutGuardHost",
      props: Schema.Struct({}),
      model: Schema.Struct({
        activeLabelId: Schema.NullOr(Schema.String),
        canEdit: Schema.Boolean,
      }),
      message: Msg,
    }).make({
      init: () => ({ activeLabelId: null, canEdit: true }),
      update: {
        Noop: ($) => $.model,
        SetActive: ($, { id }) => {
          latestActive = id;
          return $.evolve({ activeLabelId: id });
        },
        SetCanEdit: ($, { canEdit }) => $.evolve({ canEdit }),
      },
      view: (h, model) =>
        h.div.children(
          AnnotationControlRail(h, {
            activeLabelId: model.activeLabelId,
            annotation: {
              current: { classificationLabelId: null, mask: new Uint8Array() },
              dirty: false,
              canUndo: false,
              canRedo: false,
              undo: Msg.Noop(),
              redo: Msg.Noop(),
              discard: Msg.Noop(),
              commit: () => Msg.Noop(),
            },
            brushSize: 8,
            canEdit: model.canEdit,
            frame: null,
            labels: labelFixtures,
            mode: "segmentation",
            openLabelDialog: Msg.Noop(),
            overlayOpacity: 0.65,
            setActiveLabelId: (id) => Msg.SetActive({ id }),
            setBrushSize: () => Msg.Noop(),
            setMode: () => Msg.Noop(),
            setOverlayOpacity: () => Msg.Noop(),
            workspacePath: "/workspace",
            sectionAppearance: "rail",
          }),
        ),
    });

    const { container, root } = await mountTest(Host, {});
    await flushMicrotasks();

    const class1 = findButton(container, "Class 1")!;
    expect(class1.getAttribute("aria-keyshortcuts")).toBe("Shift+1");
    expect(class1.querySelector("kbd")?.textContent).toBe("⇧1");
    expect(findButton(container, "Class 2")!.querySelector("kbd")?.textContent).toBe("⇧2");

    keyDownElement(window, "1", { code: "Digit1", shiftKey: false });
    await flushMicrotasks();
    expect(latestActive).toBeNull();

    keyDownElement(window, "@", { code: "Digit2", shiftKey: true });
    await flushMicrotasks();
    expect(latestActive).toBe("class-2");

    const field = document.createElement("input");
    document.body.appendChild(field);
    keyDownElement(field, "!", { code: "Digit1", shiftKey: true });
    await flushMicrotasks();
    expect(latestActive).toBe("class-2");
    field.remove();

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    keyDownElement(window, "!", { code: "Digit1", shiftKey: true });
    await flushMicrotasks();
    expect(latestActive).toBe("class-2");
    dialog.remove();

    root.send(Msg.SetCanEdit({ canEdit: false }));
    await flushMicrotasks();
    keyDownElement(window, "!", { code: "Digit1", shiftKey: true });
    await flushMicrotasks();
    expect(latestActive).toBe("class-2");
  });
});
