import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { AlignGridShape, AlignGridState } from "@lisca/contracts";
import { createDefaultAlignGrid } from "@lisca/utils";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AlignGridRail } from "../src/align/align-grid-rail";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

afterEach(cleanupMounted);

function findButton(root: ParentNode, name: string): HTMLButtonElement | null {
  return (
    [...root.querySelectorAll("button")].find(
      (el) => (el.getAttribute("aria-label") ?? el.textContent?.trim()) === name,
    ) ?? null
  );
}

function sectionFor(root: ParentNode, name: string): HTMLElement {
  const trigger = findButton(root, name);
  expect(trigger).not.toBeNull();
  const section = trigger!.closest<HTMLElement>('[data-slot="panel"]');
  expect(section).not.toBeNull();
  return section!;
}

function fieldTitles(section: HTMLElement) {
  return Array.from(section.querySelectorAll('[data-slot="field-label"]'), (label) =>
    (label.querySelector(":scope > span:first-child") ?? label).textContent?.trim(),
  );
}

function getSpinbutton(root: ParentNode, name: string): HTMLInputElement {
  const input = root.querySelector<HTMLInputElement>(`input[type="number"][aria-label="${name}"]`);
  if (!input) throw new Error(`Spinbutton not found: ${name}`);
  return input;
}

async function mountGridRail(
  options: {
    grid?: AlignGridState;
    disabled?: boolean;
    rail?: boolean;
    translationEditable?: boolean;
    shownTranslation?: { tx: number; ty: number };
    onGridChange?: (next: AlignGridState) => void;
    onTranslationDelta?: (dx: number, dy: number) => void;
    onDetectGrid?: (shape?: AlignGridShape) => void;
  } = {},
) {
  const Msg = UiSchema.TaggedEnum({
    GridChanged: { grid: Schema.Any },
    TranslationDelta: { dx: Schema.Number, dy: Schema.Number },
    DetectGrid: { shape: Schema.NullOr(Schema.String) },
  });

  const grid = options.grid ?? createDefaultAlignGrid();
  const Host = Html.component({
    name: "AlignGridRailTestHost",
    model: Schema.Struct({}),
    message: Msg,
  }).make({
    init: () => ({}),
    update: {
      GridChanged: ($, { grid: next }) => {
        options.onGridChange?.(next as AlignGridState);
        return $.model;
      },
      TranslationDelta: ($, { dx, dy }) => {
        options.onTranslationDelta?.(dx, dy);
        return $.model;
      },
      DetectGrid: ($, { shape }) => {
        options.onDetectGrid?.((shape as AlignGridShape | null) ?? undefined);
        return $.model;
      },
    },
    view: (h) =>
      AlignGridRail(h, {
        grid,
        ...(options.disabled !== undefined ? { disabled: options.disabled } : {}),
        ...(options.rail ? { sectionAppearance: "rail" as const } : {}),
        ...(options.translationEditable !== undefined
          ? { translationEditable: options.translationEditable }
          : {}),
        ...(options.shownTranslation !== undefined
          ? { shownTranslation: options.shownTranslation }
          : {}),
        ...(options.onTranslationDelta !== undefined
          ? { onTranslationDelta: (dx, dy) => Msg.TranslationDelta({ dx, dy }) }
          : {}),
        ...(options.onDetectGrid !== undefined
          ? { onDetectGrid: (shape) => Msg.DetectGrid({ shape: shape ?? null }) }
          : {}),
        onGridChange: (next) => Msg.GridChanged({ grid: next }),
      }),
  });

  return mountTest(Host, {});
}

describe("AlignGrid section placement", () => {
  it("partitions compact rail controls into independently collapsible Grid and Geometry sections", async () => {
    const { container } = await mountGridRail({ rail: true });

    const gridElement = sectionFor(container, "Grid");
    const geometryElement = sectionFor(container, "Geometry");

    expect(findButton(gridElement, "Show grid overlay")).toBeTruthy();
    expect(gridElement.textContent).toContain("Opacity");
    expect(gridElement.textContent).toContain("Grid shape");
    expect(gridElement.textContent).not.toContain("Rotation");
    expect(gridElement.querySelectorAll('[data-rail-layout="stack"]')).toHaveLength(1);
    const showResetPair = gridElement.querySelector('[data-rail-layout="action-pair"]');
    expect(showResetPair).not.toBeNull();
    expect(showResetPair?.getAttribute("aria-label")).toBe("Grid visibility");
    expect(gridElement.querySelectorAll('[data-rail-layout="field-pair"]')).toHaveLength(0);
    expect(Array.from(showResetPair?.children ?? [], (child) => child.textContent?.trim())).toEqual(
      ["Show", "Reset"],
    );

    expect(geometryElement.textContent).toContain("Rotation");
    expect(geometryElement.textContent).toContain("Spacing X");
    expect(geometryElement.textContent).toContain("Spacing Y");
    expect(geometryElement.textContent).toContain("Pattern Width");
    expect(geometryElement.textContent).toContain("Pattern Height");
    expect(geometryElement.textContent).toContain("Offset X");
    expect(geometryElement.textContent).toContain("Offset Y");
    expect(findButton(geometryElement, "Show grid overlay")).toBeNull();
    expect(geometryElement.querySelectorAll('[data-rail-layout="field-pair"]')).toHaveLength(3);
    expect(fieldTitles(geometryElement)).toEqual([
      "Offset X",
      "Offset Y",
      "Rotation",
      "Spacing X",
      "Spacing Y",
      "Pattern Width",
      "Pattern Height",
    ]);

    clickElement(findButton(container, "Geometry")!);
    await flushMicrotasks();
    expect(findButton(gridElement, "Show grid overlay")).toBeTruthy();
    expect(geometryElement.textContent).not.toContain("Rotation");
  });

  it("shows live rail values and forwards the disabled state through the adapter", async () => {
    const { container } = await mountGridRail({ disabled: true, rail: true });

    const gridElement = sectionFor(container, "Grid");
    const geometryElement = sectionFor(container, "Geometry");

    expect(gridElement.textContent).toContain("35%");
    expect(geometryElement.textContent).toContain("0°");
    expect(findButton(gridElement, "Show grid overlay")!.hasAttribute("disabled")).toBe(true);
    expect(
      Array.from(geometryElement.querySelectorAll('input[type="number"]')).every((input) =>
        input.hasAttribute("disabled"),
      ),
    ).toBe(true);
  });

  it("keeps spacing editable when offset fields are read-only", async () => {
    const { container } = await mountGridRail({ rail: true, translationEditable: false });

    const geometryElement = sectionFor(container, "Geometry");
    expect(getSpinbutton(geometryElement, "Offset X").hasAttribute("disabled")).toBe(true);
    expect(getSpinbutton(geometryElement, "Offset Y").hasAttribute("disabled")).toBe(true);
    expect(getSpinbutton(geometryElement, "Spacing X").hasAttribute("disabled")).toBe(false);
  });

  it("commits an offset delta from the shown translation", async () => {
    const onGridChange = vi.fn();
    const onTranslationDelta = vi.fn();
    const grid = { ...createDefaultAlignGrid(), tx: 1, ty: 2 };
    const { container } = await mountGridRail({
      grid,
      onGridChange,
      onTranslationDelta,
      rail: true,
      shownTranslation: { tx: 5, ty: 2 },
    });

    const input = getSpinbutton(sectionFor(container, "Geometry"), "Offset X");
    input.value = "8";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushMicrotasks();
    input.dispatchEvent(new FocusEvent("blur"));
    await flushMicrotasks();

    expect(onTranslationDelta).toHaveBeenCalledWith(3, 0);
    expect(onGridChange).not.toHaveBeenCalled();
  });

  it("runs Auto-detect from the Grid section without requiring a Save", async () => {
    const onDetectGrid = vi.fn();
    const { container } = await mountGridRail({ onDetectGrid, rail: true });

    const grid = sectionFor(container, "Grid");
    const geometry = sectionFor(container, "Geometry");
    const autoDetect = findButton(grid, "Auto-detect");
    expect(autoDetect).toBeTruthy();
    expect(grid.querySelector('[aria-label="Detect shape"]')).toBeTruthy();
    expect(findButton(geometry, "Auto-detect")).toBeNull();

    clickElement(autoDetect!);
    await flushMicrotasks();
    expect(onDetectGrid).toHaveBeenCalledWith(undefined);
  });

  it("preserves the established combined framed section", async () => {
    const { container } = await mountGridRail();

    const gridElement = sectionFor(container, "Grid");

    expect(findButton(container, "Geometry")).toBeNull();
    expect(gridElement.textContent).toContain("Grid shape");
    expect(gridElement.textContent).toContain("Rotation");
    expect(gridElement.textContent).toContain("Offset Y");
    expect(gridElement.textContent).not.toContain("35%");
    expect(gridElement.textContent).not.toContain("0°");
    expect(fieldTitles(gridElement)).toEqual([
      "Opacity",
      "Grid shape",
      "Rotation",
      "Spacing X",
      "Spacing Y",
      "Pattern Width",
      "Pattern Height",
      "Offset X",
      "Offset Y",
    ]);
  });
});
