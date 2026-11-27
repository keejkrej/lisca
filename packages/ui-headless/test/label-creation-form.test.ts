import type { AnnotationLabel } from "@lisca/contracts";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  createLabelCreationForm,
  labelDraftsFrom,
  normalizeLabelId,
  validateLabelDrafts,
} from "../src/label-creation-form";

describe("label creation form", () => {
  it("normalizes label ids from names", () => {
    expect(normalizeLabelId("  My Class Name ")).toBe("my-class-name");
  });

  it("uses defaults when no labels exist", () => {
    expect(labelDraftsFrom([])).toHaveLength(3);
  });

  it("validates unique ids and required fields", () => {
    expect(
      validateLabelDrafts([
        { draftKey: "a", id: "a", name: "A", color: "#fff" },
        { draftKey: "b", id: "a", name: "B", color: "#000" },
      ]),
    ).toBe("Label ids must be unique.");
  });

  it("submits normalized labels from controller state and resets on reopen", () => {
    const form = createLabelCreationForm({ open: true, labels: [], error: null });
    const listener = vi.fn();
    form.subscribe(listener);

    form.updateDraft(0, { name: "Positive", id: "positive" });
    expect(listener).toHaveBeenCalled();

    const saved: AnnotationLabel[] | null = form.submit();
    expect(saved?.[0]).toEqual({ id: "positive", name: "Positive", color: "#22c55e" });
    expect(saved).toHaveLength(3);

    form.syncExternal({ open: false, labels: saved ?? [], error: null });
    form.syncExternal({ open: true, labels: saved ?? [], error: null });
    expect(form.getState().drafts[0]?.name).toBe("Positive");
  });

  it("exposes local validation error over external error", () => {
    const form = createLabelCreationForm({ open: true, labels: [], error: "Server error" });
    expect(form.getState().activeError).toBe("Server error");

    form.updateDraft(0, { name: "   ", id: "   " });
    expect(form.submit()).toBeNull();
    expect(form.getState().localError).toBe("Each label needs an id, name, and color.");
    expect(form.getState().activeError).toBe("Each label needs an id, name, and color.");
  });
});
