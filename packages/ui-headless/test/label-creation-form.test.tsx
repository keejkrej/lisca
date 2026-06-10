import type { AnnotationLabel } from "@lisca/contracts";
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  labelDraftsFrom,
  normalizeLabelId,
  useLabelCreationForm,
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
        { id: "a", name: "A", color: "#fff" },
        { id: "a", name: "B", color: "#000" },
      ]),
    ).toBe("Label ids must be unique.");
  });

  it("submits normalized labels from hook state", () => {
    const { result, rerender } = renderHook(
      (props: { open: boolean; labels: AnnotationLabel[]; error: string | null }) =>
        useLabelCreationForm(props),
      {
        initialProps: { open: true, labels: [], error: null },
      },
    );

    act(() => {
      result.current.updateDraft(0, { name: "Positive", id: "positive" });
    });

    let saved: AnnotationLabel[] | null = null;
    act(() => {
      saved = result.current.submit();
    });
    expect(saved?.[0]).toEqual({ id: "positive", name: "Positive", color: "#22c55e" });
    expect(saved).toHaveLength(3);

    rerender({ open: false, labels: saved ?? [], error: null });
    rerender({ open: true, labels: saved ?? [], error: null });
    expect(result.current.drafts[0]?.name).toBe("Positive");
  });
});
