import { describe, expect, it, vi } from "vitest";

import {
  dockToolLabel,
  dockToolShortcuts,
  resolveDockToolShortcut,
  type DockToolAction,
} from "../src/dock";

function action(id: string, overrides?: Partial<DockToolAction>): DockToolAction {
  return {
    id,
    label: id,
    onSelect: vi.fn(),
    ...overrides,
  };
}

const baseContext = {
  editableTarget: false,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};

describe("dock", () => {
  it("dockToolLabel appends 1-based shortcut index", () => {
    expect(dockToolLabel("Brush", 0)).toBe("Brush (1)");
    expect(dockToolLabel("Lasso", 3)).toBe("Lasso (4)");
  });

  it("dockToolShortcuts maps actions to digit keys", () => {
    const shortcuts = dockToolShortcuts([action("brush"), action("lasso")]);
    expect(shortcuts.map((entry) => entry.key)).toEqual(["1", "2"]);
  });

  it("resolveDockToolShortcut maps digit keys to actions", () => {
    const brush = action("brush");
    const lasso = action("lasso");
    const resolved = resolveDockToolShortcut([brush, lasso], { ...baseContext, key: "2" });
    expect(resolved).toBe(lasso);
  });

  it("resolveDockToolShortcut ignores modifiers and editable targets", () => {
    const brush = action("brush");
    expect(
      resolveDockToolShortcut([brush], { ...baseContext, key: "1", metaKey: true }),
    ).toBeNull();
    expect(
      resolveDockToolShortcut([brush], { ...baseContext, key: "1", editableTarget: true }),
    ).toBeNull();
  });

  it("resolveDockToolShortcut ignores out-of-range and disabled actions", () => {
    const brush = action("brush");
    expect(resolveDockToolShortcut([brush], { ...baseContext, key: "0" })).toBeNull();
    expect(resolveDockToolShortcut([brush], { ...baseContext, key: "2" })).toBeNull();
    expect(
      resolveDockToolShortcut(
        [action("brush", { disabled: true })],
        { ...baseContext, key: "1" },
      ),
    ).toBeNull();
  });
});
