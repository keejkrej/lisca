import type { AnnotationLabel } from "@lisca/contracts";
import { createSignal } from "solid-js";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";

import {
  labelDraftsFrom,
  normalizeLabelId,
  useLabelCreationForm,
  validateLabelDrafts,
} from "../src/label-creation-form";

function mountLabelCreationForm(initial: {
  open: boolean;
  labels: AnnotationLabel[];
  error: string | null;
}) {
  const [props, setProps] = createSignal(initial);
  let result!: ReturnType<typeof useLabelCreationForm>;
  render(() => {
    result = useLabelCreationForm(props);
    return null;
  });
  return {
    result: () => result,
    rerender: (next: typeof initial) => setProps(() => next),
  };
}

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

  it("submits normalized labels from hook state", () => {
    const harness = mountLabelCreationForm({ open: true, labels: [], error: null });

    harness.result().updateDraft(0, { name: "Positive", id: "positive" });

    let saved: AnnotationLabel[] | null = null;
    saved = harness.result().submit();
    expect(saved?.[0]).toEqual({ id: "positive", name: "Positive", color: "#22c55e" });
    expect(saved).toHaveLength(3);

    harness.rerender({ open: false, labels: saved ?? [], error: null });
    harness.rerender({ open: true, labels: saved ?? [], error: null });
    expect(harness.result().drafts()[0]?.name).toBe("Positive");
  });
});
