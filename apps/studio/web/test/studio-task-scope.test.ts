import { describe, expect, it } from "vite-plus/test";

import {
  filterStudioTaskOperations,
  operationMatchesStudioTaskScope,
  studioTaskCenterCopy,
  studioTaskScopeForPath,
} from "../src/components/studio-task-scope";

const operation = (kind: string) => ({ kind });

describe("studio task scope", () => {
  it("keeps crop tasks on Align and analysis tasks on Analysis", () => {
    expect(studioTaskScopeForPath("/align")).toBe("crop");
    expect(studioTaskScopeForPath("/analysis")).toBe("analysis");
    expect(studioTaskScopeForPath("/metadata")).toBeNull();
    expect(studioTaskScopeForPath("/annotate")).toBeNull();
    expect(studioTaskScopeForPath("/assay")).toBeNull();

    const operations = [
      operation("crop-roi"),
      operation("analysis/transfection"),
      operation("analysis/killing"),
      operation("analysis/custom"),
    ];

    expect(operationMatchesStudioTaskScope("crop-roi", "crop")).toBe(true);
    expect(operationMatchesStudioTaskScope("analysis/transfection", "crop")).toBe(false);
    expect(filterStudioTaskOperations(operations, "crop").map((item) => item.kind)).toEqual([
      "crop-roi",
    ]);
    expect(filterStudioTaskOperations(operations, "analysis").map((item) => item.kind)).toEqual([
      "analysis/transfection",
      "analysis/killing",
      "analysis/custom",
    ]);
    expect(studioTaskCenterCopy("crop")).toEqual({
      label: "Cropping",
      title: "Cropping",
      description: "Background crop computations",
      emptyTitle: "No crop tasks yet",
      emptyMessage: "Long-running crop computations will appear here.",
    });
    expect(studioTaskCenterCopy("analysis")).toEqual({
      label: "Analysis",
      title: "Analysis",
      description: "Background analysis computations",
      emptyTitle: "No analysis tasks yet",
      emptyMessage: "Long-running analysis computations will appear here.",
    });
  });
});
