import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioAssayActions } from "../src/components/studio-assay-dock";
import { studioCommandForShortcut } from "../src/navigation/studio-command-shortcuts";
import {
  useStudioCommandShortcut,
  commandShortcutKeys,
} from "../src/navigation/use-studio-command-shortcut";
import { studioPageShortcutPlatform } from "../src/navigation/studio-page-shortcuts";

const baseContext = {
  editableTarget: false,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};

function press(key: string, extra: KeyboardEventInit = {}) {
  const platform = studioPageShortcutPlatform();
  fireEvent.keyDown(window, {
    key,
    metaKey: platform === "mac",
    ctrlKey: platform !== "mac",
    cancelable: true,
    bubbles: true,
    ...extra,
  });
}

describe("studio command shortcuts", () => {
  it("maps Command+O/N/S on macOS and Control+O/N/S elsewhere", () => {
    expect(studioCommandForShortcut({ ...baseContext, key: "o", metaKey: true }, "mac")).toBe(
      "open",
    );
    expect(studioCommandForShortcut({ ...baseContext, key: "N", metaKey: true }, "mac")).toBe(
      "new",
    );
    expect(studioCommandForShortcut({ ...baseContext, key: "s", metaKey: true }, "mac")).toBe(
      "save",
    );
    expect(studioCommandForShortcut({ ...baseContext, key: "s", ctrlKey: true }, "mac")).toBeNull();
    expect(
      studioCommandForShortcut({ ...baseContext, key: "s", metaKey: true, shiftKey: true }, "mac"),
    ).toBeNull();
    expect(studioCommandForShortcut({ ...baseContext, key: "o", ctrlKey: true }, "other")).toBe(
      "open",
    );
    expect(
      studioCommandForShortcut({ ...baseContext, key: "s", metaKey: true }, "other"),
    ).toBeNull();
    expect(
      studioCommandForShortcut(
        { ...baseContext, key: "s", ctrlKey: true, editableTarget: true },
        "other",
      ),
    ).toBe("save");
    expect(
      studioCommandForShortcut({ ...baseContext, key: "ArrowLeft", metaKey: true }, "mac"),
    ).toBe("back");
    expect(
      studioCommandForShortcut({ ...baseContext, key: "ArrowRight", ctrlKey: true }, "other"),
    ).toBe("next");
    expect(
      studioCommandForShortcut(
        { ...baseContext, key: "ArrowLeft", metaKey: true, editableTarget: true },
        "mac",
      ),
    ).toBeNull();
    expect(studioCommandForShortcut({ ...baseContext, key: "e", metaKey: true }, "mac")).toBe(
      "expert",
    );
    expect(studioCommandForShortcut({ ...baseContext, key: "t", ctrlKey: true }, "other")).toBe(
      "tasks",
    );
    expect(studioCommandForShortcut({ ...baseContext, key: "e", ctrlKey: true }, "mac")).toBeNull();
    expect(studioCommandForShortcut({ ...baseContext, key: "c", metaKey: true }, "mac")).toBe(
      "crop",
    );
    expect(studioCommandForShortcut({ ...baseContext, key: "a", metaKey: true }, "mac")).toBe(
      "analyze",
    );
    expect(
      studioCommandForShortcut(
        { ...baseContext, key: "a", metaKey: true, editableTarget: true },
        "mac",
      ),
    ).toBeNull();
    expect(
      studioCommandForShortcut(
        { ...baseContext, key: "c", metaKey: true, editableTarget: true },
        "mac",
      ),
    ).toBeNull();
  });

  it("uses Meta on macOS and Control elsewhere for the button hint", () => {
    const platform = studioPageShortcutPlatform();
    const save = commandShortcutKeys("save");
    expect(save).toBe(platform === "mac" ? "Meta+S" : "Control+S");
  });
});

describe("useStudioCommandShortcut", () => {
  afterEach(() => {
    cleanup();
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta", bubbles: true }));
  });

  it("shows Open and New chords only while the command modifier is held", () => {
    const platform = studioPageShortcutPlatform();
    render(() => (
      <StudioAssayActions
        assayPickerOpen={false}
        openingAssay={false}
        onNewAssay={() => undefined}
        onOpenAssay={() => undefined}
      />
    ));
    const open = screen.getByRole("button", { name: "Open" });
    expect(open.querySelector("kbd")).toBeNull();
    press(platform === "mac" ? "Meta" : "Control");
    expect(open.querySelector("kbd")?.textContent).toBe(platform === "mac" ? "⌘O" : "Ctrl+O");
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta", bubbles: true }));
    expect(open.querySelector("kbd")).toBeNull();
  });

  it("fires only while mounted, and ignores a disabled command", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    const view = render(() => (
      <StudioAssayActions
        assayPickerOpen={false}
        openingAssay={false}
        onNewAssay={onNew}
        onOpenAssay={onOpen}
      />
    ));

    press("o");
    press("n");
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onNew).toHaveBeenCalledOnce();

    view.unmount();
    press("o");
    press("n");
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("does not open while the assay picker is open", () => {
    const onOpen = vi.fn();
    render(() => (
      <StudioAssayActions
        assayPickerOpen
        openingAssay={false}
        onNewAssay={() => undefined}
        onOpenAssay={onOpen}
      />
    ));
    press("o");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not repeat a held save chord", () => {
    const onSave = vi.fn();
    render(() => {
      useStudioCommandShortcut("save", () => true, onSave);
      return null;
    });
    press("s", { repeat: true });
    expect(onSave).not.toHaveBeenCalled();
    press("s");
    expect(onSave).toHaveBeenCalledOnce();
  });
});
