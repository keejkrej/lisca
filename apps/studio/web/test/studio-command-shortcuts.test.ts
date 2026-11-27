import { UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioAssayActions } from "../src/components/studio-assay-dock";
import { studioCommandForShortcut } from "../src/navigation/studio-command-shortcuts";
import { studioPageShortcutPlatform } from "../src/navigation/studio-page-shortcuts";
import {
  commandShortcutKeys,
  studioCommandShortcutSubscription,
} from "../src/navigation/use-studio-command-shortcut";
import {
  cleanupMounted,
  flushMicrotasks,
  keyDownElement,
  mountTest,
  waitForCondition,
} from "./render-helper";

const baseContext = {
  editableTarget: false,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};

function press(key: string, extra: KeyboardEventInit = {}) {
  const platform = studioPageShortcutPlatform();
  keyDownElement(window, key, {
    metaKey: platform === "mac",
    ctrlKey: platform !== "mac",
    ...extra,
  });
}

function findButton(root: ParentNode, name: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === name || button.textContent?.startsWith(name),
  );
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

const AssayActionsHostMsg = UiSchema.TaggedEnum({
  Open: {},
  New: {},
});

const AssayActionsHostEvents = UiSchema.TaggedEnum({
  Open: {},
  New: {},
});

const AssayActionsHost = Html.component({
  name: "AssayActionsTestHost",
  props: Schema.Struct({
    assayPickerOpen: Schema.Boolean,
    openingAssay: Schema.Boolean,
  }),
  model: Schema.Struct({}),
  message: AssayActionsHostMsg,
  events: AssayActionsHostEvents,
}).make({
  init: () => ({}),
  update: {
    Open: ($) => $.emit(AssayActionsHostEvents.Open()),
    New: ($) => $.emit(AssayActionsHostEvents.New()),
  },
  view: (h) =>
    StudioAssayActions(h, {
      assayPickerOpen: h.props.assayPickerOpen,
      openingAssay: h.props.openingAssay,
      onNewAssay: AssayActionsHostMsg.New(),
      onOpenAssay: AssayActionsHostMsg.Open(),
    }),
});

describe("studioCommandShortcutSubscription", () => {
  afterEach(async () => {
    await cleanupMounted();
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta", bubbles: true }));
  });

  it("shows Open and New chords only while the command modifier is held", async () => {
    const platform = studioPageShortcutPlatform();
    const { container } = await mountTest(AssayActionsHost, {
      assayPickerOpen: false,
      openingAssay: false,
    });
    await flushMicrotasks();
    const open = findButton(container, "Open")!;
    expect(open).toBeTruthy();
    expect(open.querySelector("kbd")).toBeNull();

    press(platform === "mac" ? "Meta" : "Control");
    await waitForCondition(
      () => open.querySelector("kbd")?.textContent === (platform === "mac" ? "⌘O" : "Ctrl+O"),
    );

    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta", bubbles: true }));
    await waitForCondition(() => open.querySelector("kbd") === null);
  });

  it("fires only while mounted, and ignores a disabled command", async () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    const view = await mountTest(
      AssayActionsHost,
      { assayPickerOpen: false, openingAssay: false },
      {
        onEmit: (event) => {
          if (event._tag === "Open") onOpen();
          if (event._tag === "New") onNew();
        },
      },
    );
    await flushMicrotasks();

    press("o");
    press("n");
    await waitForCondition(() => onOpen.mock.calls.length === 1 && onNew.mock.calls.length === 1);

    await view.unmount();
    press("o");
    press("n");
    await flushMicrotasks();
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("does not open while the assay picker is open", async () => {
    const onOpen = vi.fn();
    await mountTest(
      AssayActionsHost,
      { assayPickerOpen: true, openingAssay: false },
      {
        onEmit: (event) => {
          if (event._tag === "Open") onOpen();
        },
      },
    );
    press("o");
    await flushMicrotasks();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not repeat a held save chord", async () => {
    const onSave = vi.fn();
    const SaveMsg = UiSchema.TaggedEnum({ Save: {} });
    const SaveEvents = UiSchema.TaggedEnum({ Save: {} });
    const SaveHost = Html.component({
      name: "SaveShortcutTestHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: SaveMsg,
      events: SaveEvents,
    }).make({
      init: () => ({}),
      update: {
        Save: ($) => $.emit(SaveEvents.Save()),
      },
      subscriptions: () => [studioCommandShortcutSubscription("save", true, SaveMsg.Save())],
      view: () => View.text(""),
    });

    await mountTest(
      SaveHost,
      {},
      {
        onEmit: () => onSave(),
      },
    );

    press("s", { repeat: true });
    await flushMicrotasks();
    expect(onSave).not.toHaveBeenCalled();

    press("s");
    await waitForCondition(() => onSave.mock.calls.length === 1);
    expect(onSave).toHaveBeenCalledOnce();
  });
});
