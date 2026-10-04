import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { SourcePickerField } from "../src/features/host/source-picker-field";

afterEach(cleanup);

function renderField(overrides: Partial<Parameters<typeof SourcePickerField>[0]> = {}) {
  const handlers = {
    onOpenFolder: vi.fn(),
    onOpenNd2: vi.fn(),
    onOpenCzi: vi.fn(),
  };
  render(() => (
    <SourcePickerField
      id="source"
      label="Source"
      placeholder="Click to choose source…"
      value=""
      {...handlers}
      {...overrides}
    />
  ));
  return handlers;
}

function openMenu() {
  const trigger = screen.getByRole("button", { name: "Source: Click to choose source…. Browse" });
  fireEvent.keyDown(trigger, { key: "Enter" });
}

describe("SourcePickerField", () => {
  it("opens a format menu from the path field and routes the chosen format", async () => {
    const handlers = renderField();
    openMenu();

    fireEvent.keyDown(await screen.findByRole("menuitem", { name: /ND2/ }), { key: "Enter" });
    expect(handlers.onOpenNd2).toHaveBeenCalledOnce();
    expect(handlers.onOpenFolder).not.toHaveBeenCalled();
    expect(handlers.onOpenCzi).not.toHaveBeenCalled();
  });

  it("offers only source formats, with no recent list", async () => {
    renderField();
    openMenu();

    expect(await screen.findByRole("menuitem", { name: /Folder/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /ND2/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /CZI/ })).toBeTruthy();
    expect(screen.queryByText("Recent")).toBeNull();
  });
});
