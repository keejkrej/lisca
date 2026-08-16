import { cleanup, fireEvent, render, screen, within } from "@solidjs/testing-library";
import { createDefaultAlignGrid } from "@lisca/utils";
import { afterEach, describe, expect, it } from "vitest";

import { AlignGridRail } from "../src/features/align/align-grid-rail";

afterEach(cleanup);

function GridFixture(props: { disabled?: boolean; rail?: boolean }) {
  return (
    <AlignGridRail
      disabled={props.disabled}
      grid={createDefaultAlignGrid()}
      sectionAppearance={props.rail ? "rail" : undefined}
      onGridChange={() => undefined}
    />
  );
}

function sectionFor(name: string) {
  const trigger = screen.getByRole("button", { name });
  const section = trigger.closest('[data-slot="panel"]');
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

function fieldTitles(section: HTMLElement) {
  return Array.from(section.querySelectorAll('[data-slot="field-label"]'), (label) =>
    (label.querySelector(":scope > span:first-child") ?? label).textContent?.trim(),
  );
}

describe("AlignGrid section placement", () => {
  it("partitions compact rail controls into independently collapsible Grid and Geometry sections", () => {
    render(() => <GridFixture rail />);

    const gridElement = sectionFor("Grid");
    const geometryElement = sectionFor("Geometry");
    const grid = within(gridElement);
    const geometry = within(geometryElement);

    expect(grid.getByRole("button", { name: "Show grid overlay" })).toBeTruthy();
    expect(grid.getByText("Opacity")).toBeTruthy();
    expect(grid.getByText("Grid shape")).toBeTruthy();
    expect(grid.queryByText("Rotation")).toBeNull();
    expect(gridElement.querySelectorAll('[data-rail-layout="stack"]')).toHaveLength(1);
    const showResetPair = gridElement.querySelector('[data-rail-layout="action-pair"]');
    expect(showResetPair).not.toBeNull();
    expect(showResetPair?.getAttribute("aria-label")).toBe("Grid visibility");
    expect(gridElement.querySelectorAll('[data-rail-layout="field-pair"]')).toHaveLength(0);
    expect(Array.from(showResetPair?.children ?? [], (child) => child.textContent?.trim())).toEqual(
      ["Show", "Reset"],
    );

    expect(geometry.getByText("Rotation")).toBeTruthy();
    expect(geometry.getByText("Spacing X")).toBeTruthy();
    expect(geometry.getByText("Spacing Y")).toBeTruthy();
    expect(geometry.getByText("Pattern Width")).toBeTruthy();
    expect(geometry.getByText("Pattern Height")).toBeTruthy();
    expect(geometry.getByText("Offset X")).toBeTruthy();
    expect(geometry.getByText("Offset Y")).toBeTruthy();
    expect(geometry.queryByRole("button", { name: "Show grid overlay" })).toBeNull();
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

    fireEvent.click(screen.getByRole("button", { name: "Geometry" }));
    expect(within(gridElement).getByRole("button", { name: "Show grid overlay" })).toBeTruthy();
    expect(within(geometryElement).queryByText("Rotation")).toBeNull();
  });

  it("shows live rail values and forwards the disabled state through the adapter", () => {
    render(() => <GridFixture disabled rail />);

    const gridElement = sectionFor("Grid");
    const geometryElement = sectionFor("Geometry");

    expect(within(gridElement).getByText("35%")).toBeTruthy();
    expect(within(geometryElement).getByText("0°")).toBeTruthy();
    expect(
      within(gridElement)
        .getByRole("button", { name: "Show grid overlay" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      Array.from(geometryElement.querySelectorAll('input[type="number"]')).every((input) =>
        input.hasAttribute("disabled"),
      ),
    ).toBe(true);
  });

  it("preserves the established combined framed section", () => {
    render(() => <GridFixture />);

    const gridElement = sectionFor("Grid");
    const grid = within(gridElement);

    expect(screen.queryByRole("button", { name: "Geometry" })).toBeNull();
    expect(grid.getByText("Grid shape")).toBeTruthy();
    expect(grid.getByText("Rotation")).toBeTruthy();
    expect(grid.getByText("Offset Y")).toBeTruthy();
    expect(grid.queryByText("35%")).toBeNull();
    expect(grid.queryByText("0°")).toBeNull();
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
