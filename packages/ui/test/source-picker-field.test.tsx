import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { SourcePickerField } from "../src/features/host/source-picker-field";

afterEach(cleanup);

function renderField(overrides: Partial<Parameters<typeof SourcePickerField>[0]> = {}) {
  const handlers = {
    onOpenFolder: vi.fn(),
    onOpenNd2: vi.fn(),
    onOpenCzi: vi.fn(),
    onPickRecentSource: vi.fn(),
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

  it("lists recent sources below the formats", async () => {
    const source = { kind: "nd2", path: "/data/run.nd2" } as const;
    const handlers = renderField({ recentSources: [{ source }] });
    openMenu();

    fireEvent.keyDown(await screen.findByRole("menuitem", { name: /\/data\/run\.nd2/ }), {
      key: "Enter",
    });
    expect(handlers.onPickRecentSource).toHaveBeenCalledWith(source);
  });
});
