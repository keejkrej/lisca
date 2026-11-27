import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { Dialog, DIALOG_OVERLAY_CLASS, DIALOG_TITLE_CLASS } from "../src/components/ui/dialog";
import { ModalScrim } from "../src/patterns/modal/modal-scrim";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  keyDownElement,
  mountTest,
} from "./render-helper";

afterEach(cleanupMounted);

describe("Effect UI Kit dialogs", () => {
  it("opens from a trigger and closes with Escape", async () => {
    const Msg = UiSchema.TaggedEnum({ SetOpen: { open: Schema.Boolean } });
    const Host = Html.component({
      name: "DialogTestHost",
      model: Schema.Struct({ open: Schema.Boolean }),
      message: Msg,
    }).make({
      init: () => ({ open: false }),
      update: { SetOpen: ($, { open }) => $.evolve({ open }) },
      view: (h, model) =>
        Dialog(h, {
          props: { open: model.open },
          onEmit: {
            RequestedOpen: () => Msg.SetOpen({ open: true }),
            RequestedClose: () => Msg.SetOpen({ open: false }),
            Settled: () => undefined,
          },
          view: (dialog) =>
            h.div.children(
              dialog.trigger(h.button).children("Open task"),
              dialog
                .portal(h.dialog)
                ?.children(
                  dialog.backdrop(h.div)?.class(DIALOG_OVERLAY_CLASS),
                  dialog
                    .popup(h.div)
                    .attr("role", "dialog")
                    .children(
                      dialog.title(h.h2).class(DIALOG_TITLE_CLASS).children("Task details"),
                      dialog.close(h.button).children("Done"),
                    ),
                ),
            ),
        }),
    });

    const view = await mountTest(Host, {});
    const trigger = view.container.querySelector("button")!;
    clickElement(trigger);
    await flushMicrotasks();

    const content = document.querySelector('[role="dialog"]')!;
    expect(content).not.toBeNull();
    expect(content.textContent).toContain("Task details");

    keyDownElement(content, "Escape");
    await flushMicrotasks();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps required decisions open on Escape", async () => {
    const Host = Html.component({
      name: "RequiredModalHost",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        ModalScrim(h, {
          ariaLabel: "Save changes",
          dismissible: false,
          children: [
            h.button.attr("type", "button").children("Save"),
            h.button.attr("type", "button").children("Discard"),
          ],
        }),
    });

    await mountTest(Host, {});
    await flushMicrotasks();

    const content = document.querySelector(
      '[role="dialog"][aria-label="Save changes"]',
    ) as HTMLElement;
    expect(content).not.toBeNull();
    expect(content.dataset.slot).toBe("dialog-content");
    expect(content.dataset.liscaSlot).toBe("dialog-surface");
    expect(document.querySelector('[data-lisca-slot="modal-scrim"]')).not.toBeNull();

    keyDownElement(content, "Escape");
    await flushMicrotasks();
    expect(document.querySelector('[role="dialog"][aria-label="Save changes"]')).toBe(content);
  });

  it("dismisses a nested modal on Escape without closing its parent", async () => {
    const Msg = UiSchema.TaggedEnum({
      SetOpen: { open: Schema.Boolean },
      SetNested: { open: Schema.Boolean },
    });
    const Host = Html.component({
      name: "NestedModalHost",
      model: Schema.Struct({ open: Schema.Boolean, nested: Schema.Boolean }),
      message: Msg,
    }).make({
      init: () => ({ open: false, nested: false }),
      update: {
        SetOpen: ($, { open }) => $.evolve({ open }),
        SetNested: ($, { open }) => $.evolve({ nested: open }),
      },
      view: (h, model) =>
        h.div.children(
          h.button
            .attr("type", "button")
            .on("click", Msg.SetOpen({ open: true }))
            .children("Browse"),
          model.open
            ? ModalScrim(h, {
                key: "parent",
                ariaLabel: "Browse files",
                onDismiss: () => Msg.SetOpen({ open: false }),
                children: [
                  h.button
                    .attr("type", "button")
                    .on("click", Msg.SetNested({ open: true }))
                    .children("New folder"),
                  model.nested
                    ? ModalScrim(h, {
                        key: "child",
                        ariaLabel: "Create folder",
                        onDismiss: () => Msg.SetNested({ open: false }),
                        children: h.input.attr("aria-label", "Folder name"),
                      })
                    : undefined,
                ],
              })
            : undefined,
        ),
    });

    const view = await mountTest(Host, {});
    const browse = view.container.querySelector("button")!;
    clickElement(browse);
    await flushMicrotasks();

    const newFolder = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("New folder"),
    )!;
    clickElement(newFolder);
    await flushMicrotasks();

    const child = document.querySelector('[role="dialog"][aria-label="Create folder"]')!;
    expect(child).not.toBeNull();

    keyDownElement(child, "Escape");
    await flushMicrotasks();
    expect(document.querySelector('[role="dialog"][aria-label="Create folder"]')).toBeNull();

    const parent = document.querySelector('[role="dialog"][aria-label="Browse files"]')!;
    expect(parent).not.toBeNull();
    keyDownElement(parent, "Escape");
    await flushMicrotasks();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
