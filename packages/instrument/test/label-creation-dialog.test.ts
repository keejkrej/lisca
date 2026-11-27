import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { AnnotationLabelSchema, type AnnotationLabel } from "@lisca/contracts";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { LabelCreationDialog } from "../src/annotate/label-creation-dialog";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

afterEach(cleanupMounted);

function findButton(label: string): HTMLButtonElement {
  const buttons = Array.from(document.querySelectorAll("button"));
  const found = buttons.find(
    (btn) => btn.getAttribute("aria-label") === label || btn.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(`Button "${label}" not found`);
  }
  return found;
}

describe("LabelCreationDialog", () => {
  it("keeps Save labeled while a save is in flight and still lets you leave", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onSave = vi.fn<(labels: AnnotationLabel[]) => void>();

    const HostMsg = UiSchema.TaggedEnum({
      SetSaving: { saving: Schema.Boolean },
      OpenChanged: { open: Schema.Boolean },
      Saved: { labels: Schema.Array(AnnotationLabelSchema) },
    });

    const Host = Html.component({
      name: "LabelCreationDialogTestHost",
      model: Schema.Struct({ saving: Schema.Boolean }),
      message: HostMsg,
    }).make({
      init: () => ({ saving: true }),
      update: {
        SetSaving: ($, { saving }) => $.evolve({ saving }),
        OpenChanged: ($, { open }) => {
          onOpenChange(open);
          return $;
        },
        Saved: ($, { labels }) => {
          onSave([...labels]);
          return $;
        },
      },
      view: (h, model) =>
        LabelCreationDialog(h, {
          error: null,
          labels: [{ id: "cell", name: "Cell", color: "#10b981" }],
          open: true,
          saving: model.saving,
          workspacePath: "/workspace",
          onOpenChange: (open) => HostMsg.OpenChanged({ open }),
          onSave: (labels) => HostMsg.Saved({ labels }),
        }),
    });

    const view = await mountTest(Host, {});
    await flushMicrotasks();

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-labelledby")).toBe("label-dialog-title");
    expect(document.getElementById("label-dialog-title")?.textContent).toBe("Create labels");

    const nameInput = document.querySelector(
      'input[aria-label="Label 1 name"]',
    ) as HTMLInputElement;
    const save = findButton("Save");

    expect(dialog.getAttribute("aria-busy")).toBe("true");
    expect(nameInput.disabled).toBe(true);
    expect(save.disabled).toBe(true);
    expect(findButton("Cancel").disabled).toBe(false);
    expect(findButton("Close label dialog").disabled).toBe(false);
    expect(findButton("Add label").disabled).toBe(true);

    clickElement(save);
    await flushMicrotasks();
    expect(onSave).not.toHaveBeenCalled();

    clickElement(findButton("Cancel"));
    await flushMicrotasks();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    view.root.send(HostMsg.SetSaving({ saving: false }));
    await flushMicrotasks();

    const readySave = findButton("Save");
    expect(dialog.getAttribute("aria-busy")).toBe("false");
    expect(nameInput.disabled).toBe(false);
    expect(readySave.disabled).toBe(false);

    clickElement(readySave);
    await flushMicrotasks();
    expect(onSave).toHaveBeenCalledWith([{ id: "cell", name: "Cell", color: "#10b981" }]);
  });
});
