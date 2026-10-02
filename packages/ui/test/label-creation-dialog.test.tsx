import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { LabelCreationDialog } from "../src/features/annotate/label-creation-dialog";

afterEach(cleanup);

describe("LabelCreationDialog", () => {
  it("keeps Save labeled while a save is in flight and still lets you leave", () => {
    const [saving, setSaving] = createSignal(true);
    const onOpenChange = vi.fn();
    const onSave = vi.fn();

    render(() => (
      <LabelCreationDialog
        error={null}
        labels={[{ id: "cell", name: "Cell", color: "#10b981" }]}
        open
        saving={saving()}
        workspacePath="/workspace"
        onOpenChange={onOpenChange}
        onSave={onSave}
      />
    ));

    const dialog = screen.getByRole("dialog", { name: "Create labels" });
    const nameInput = screen.getByRole("textbox", { name: "Label 1 name" });
    const save = screen.getByRole("button", { name: "Save" });

    expect(dialog.getAttribute("aria-busy")).toBe("true");
    expect(nameInput).toHaveProperty("disabled", true);
    expect(save).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: "Close label dialog" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(screen.getByRole("button", { name: "Add label" })).toHaveProperty("disabled", true);

    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    setSaving(false);

    const readySave = screen.getByRole("button", { name: "Save" });
    expect(dialog.getAttribute("aria-busy")).toBe("false");
    expect(nameInput).toHaveProperty("disabled", false);
    expect(readySave).toHaveProperty("disabled", false);

    fireEvent.click(readySave);
    expect(onSave).toHaveBeenCalledWith([{ id: "cell", name: "Cell", color: "#10b981" }]);
  });
});
