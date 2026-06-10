import { describe, expect, it, vi } from "vitest";

import {
  resolveKeyboardShortcut,
  type KeyboardShortcut,
} from "../src/shortcuts.ts";

function shortcut(id: string, overrides?: Partial<KeyboardShortcut>): KeyboardShortcut {
  return {
    id,
    key: id,
    onTrigger: vi.fn(),
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

describe("shortcuts", () => {
  it("resolveKeyboardShortcut matches key and calls first eligible binding", () => {
    const save = shortcut("save", { key: "s" });
    const resolved = resolveKeyboardShortcut([save], { ...baseContext, key: "s" });
    expect(resolved).toBe(save);
  });

  it("resolveKeyboardShortcut requires exact modifier sets", () => {
    const save = shortcut("save", { key: "s", modifiers: { meta: true } });
    expect(resolveKeyboardShortcut([save], { ...baseContext, key: "s" })).toBeNull();
    expect(
      resolveKeyboardShortcut([save], { ...baseContext, key: "s", metaKey: true }),
    ).toBe(save);
  });

  it("resolveKeyboardShortcut ignores editable targets unless allowed", () => {
    const escape = shortcut("escape", { key: "Escape" });
    expect(
      resolveKeyboardShortcut([escape], { ...baseContext, key: "Escape", editableTarget: true }),
    ).toBeNull();
    expect(
      resolveKeyboardShortcut(
        [shortcut("escape", { key: "Escape", allowInEditable: true })],
        { ...baseContext, key: "Escape", editableTarget: true },
      ),
    ).not.toBeNull();
  });

  it("resolveKeyboardShortcut skips disabled bindings", () => {
    const save = shortcut("save", { key: "s", disabled: true });
    expect(resolveKeyboardShortcut([save], { ...baseContext, key: "s" })).toBeNull();
  });
});
