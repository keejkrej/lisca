import { describe, expect, it, vi } from "vitest";

import { buildAlignToolActions } from "../src/align-tools";

describe("buildAlignToolActions", () => {
  it("marks active tool and calls onModeChange", () => {
    const onModeChange = vi.fn();
    const actions = buildAlignToolActions("rotate", onModeChange);

    expect(actions.find((action) => action.id === "rotate")?.active).toBe(true);
    expect(actions.find((action) => action.id === "pan")?.active).toBe(false);

    actions.find((action) => action.id === "pan")?.onSelect();
    expect(onModeChange).toHaveBeenCalledWith("pan");
  });
});
