import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { createSignal, Show } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "../src/components/ui/dialog";
import { DialogSurface } from "../src/patterns/modal/dialog-surface";
import { ModalScrim } from "../src/patterns/modal/modal-scrim";

afterEach(cleanup);

describe("UI SDK dialogs", () => {
  it("opens from a trigger, closes with Escape, and restores the trigger", async () => {
    const view = render(() => (
      <Dialog>
        <DialogTrigger>Open task</DialogTrigger>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Task details</DialogTitle>
          <DialogClose>Done</DialogClose>
        </DialogContent>
      </Dialog>
    ));
    const trigger = view.getByRole("button", { name: "Open task" });
    trigger.focus();
    fireEvent.click(trigger);
    const content = await view.findByRole("dialog", { name: "Task details" });
    fireEvent.keyDown(content, { key: "Escape" });
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("keeps required decisions open on Escape", async () => {
    const view = render(() => (
      <ModalScrim>
        <DialogSurface aria-label="Save changes">
          <button type="button">Save</button>
          <button type="button">Discard</button>
        </DialogSurface>
      </ModalScrim>
    ));
    const content = await view.findByRole("dialog", { name: "Save changes" });
    expect(content.dataset.slot).toBe("dialog-content");
    expect(content.dataset.liscaSlot).toBe("dialog-surface");
    expect(view.container.querySelector('[data-lisca-slot="modal-scrim"]')).not.toBeNull();
    fireEvent.keyDown(content, { key: "Escape" });
    expect(view.getByRole("dialog", { name: "Save changes" })).toBe(content);
  });

  it("wraps Tab and Shift+Tab inside a modal surface", async () => {
    // JSDOM has no layout; make the two buttons visible to the SDK's tabbable query.
    const rectangles = vi
      .spyOn(HTMLElement.prototype, "getClientRects")
      .mockReturnValue([new DOMRect(0, 0, 100, 30)] as unknown as DOMRectList);
    try {
      const view = render(() => (
        <ModalScrim>
          <DialogSurface aria-label="Confirm action">
            <button type="button">Confirm</button>
            <button type="button">Cancel</button>
          </DialogSurface>
        </ModalScrim>
      ));
      const first = await view.findByRole("button", { name: "Confirm" });
      const last = view.getByRole("button", { name: "Cancel" });
      last.focus();
      fireEvent.keyDown(last, { key: "Tab" });
      expect(document.activeElement).toBe(first);
      fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(last);
    } finally {
      rectangles.mockRestore();
    }
  });

  it("restores focus when a workflow action unmounts an open modal", async () => {
    const view = render(() => {
      const [open, setOpen] = createSignal(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Edit settings
          </button>
          <Show when={open()}>
            <ModalScrim>
              <DialogSurface aria-label="Edit settings">
                <button type="button" onClick={() => setOpen(false)}>
                  Save settings
                </button>
              </DialogSurface>
            </ModalScrim>
          </Show>
        </>
      );
    });
    const trigger = view.getByRole("button", { name: "Edit settings" });
    trigger.focus();
    fireEvent.click(trigger);
    const save = await view.findByRole("button", { name: "Save settings" });
    save.focus();
    fireEvent.click(save);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it.each(["nested", "sibling"])(
    "dismisses the topmost %s modal without closing its parent",
    async (placement) => {
      const view = render(() => {
        const [open, setOpen] = createSignal(false);
        const [nested, setNested] = createSignal(false);
        const ChildModal = () => (
          <Show when={nested()}>
            <ModalScrim onDismiss={() => setNested(false)}>
              <DialogSurface aria-label="Create folder">
                <input aria-label="Folder name" />
              </DialogSurface>
            </ModalScrim>
          </Show>
        );
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Browse
            </button>
            <Show when={open()}>
              <ModalScrim onDismiss={() => setOpen(false)}>
                <DialogSurface aria-label="Browse files">
                  <button type="button" onClick={() => setNested(true)}>
                    New folder
                  </button>
                  {placement === "nested" && <ChildModal />}
                </DialogSurface>
              </ModalScrim>
              {placement === "sibling" && <ChildModal />}
            </Show>
          </>
        );
      });
      const browse = view.getByRole("button", { name: "Browse" });
      browse.focus();
      fireEvent.click(browse);
      const newFolder = await view.findByRole("button", { name: "New folder" });
      newFolder.focus();
      fireEvent.click(newFolder);
      const child = await view.findByRole("dialog", { name: "Create folder" });
      fireEvent.keyDown(child, { key: "Escape" });
      await waitFor(() => expect(view.queryByRole("dialog", { name: "Create folder" })).toBeNull());
      const parent = view.getByRole("dialog", { name: "Browse files" });
      await waitFor(() => expect(document.activeElement).toBe(newFolder));
      fireEvent.keyDown(parent, { key: "Escape" });
      await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(browse));
    },
  );
});
