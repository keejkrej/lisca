import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PathPickerField } from "../src/features/host/path-picker-field";

afterEach(cleanup);

describe("PathPickerField", () => {
  it("renders a semantic picker trigger with a persistent trailing action", () => {
    const onOpen = vi.fn();

    render(() => (
      <PathPickerField
        id="workspace"
        label="Workspace"
        placeholder="Click to choose folder…"
        value="/data/workspace"
        onOpen={onOpen}
      />
    ));

    const trigger = screen.getByRole("button", {
      name: "Workspace: /data/workspace. Browse",
    });
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.textContent).toContain("/data/workspace");
    expect(trigger.textContent).toContain("Browse");

    fireEvent.click(trigger);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("shows the placeholder without dropping the Browse cue", () => {
    render(() => (
      <PathPickerField
        id="source"
        label="Source"
        placeholder="Click to choose source…"
        value=""
        onOpen={() => undefined}
      />
    ));

    const trigger = screen.getByRole("button", {
      name: "Source: Click to choose source…. Browse",
    });
    expect(trigger.textContent).toContain("Click to choose source…");
    expect(trigger.textContent).toContain("Browse");
  });
});
