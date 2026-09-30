import { describe, expect, it } from "vite-plus/test";

import {
  filterStudioTasks,
  taskMatchesStudioTaskScope,
  studioTaskCenterCopy,
  studioTaskScopeForPath,
} from "../src/components/studio-task-scope";

const task = (kind: string) => ({ kind });

describe("studio task scope", () => {
  it("keeps crop tasks on Align and analysis tasks on Analysis", () => {
    expect(studioTaskScopeForPath("/align")).toBe("crop");
    expect(studioTaskScopeForPath("/analysis")).toBe("analysis");
    expect(studioTaskScopeForPath("/metadata")).toBeNull();
    expect(studioTaskScopeForPath("/annotate")).toBeNull();
    expect(studioTaskScopeForPath("/assay")).toBeNull();

    const tasks = [
      task("crop-roi"),
      task("analysis/transfection"),
      task("analysis/killing"),
      task("analysis/custom"),
    ];

    expect(taskMatchesStudioTaskScope("crop-roi", "crop")).toBe(true);
    expect(taskMatchesStudioTaskScope("analysis/transfection", "crop")).toBe(false);
    expect(filterStudioTasks(tasks, "crop").map((item) => item.kind)).toEqual(["crop-roi"]);
    expect(filterStudioTasks(tasks, "analysis").map((item) => item.kind)).toEqual([
      "analysis/transfection",
      "analysis/killing",
      "analysis/custom",
    ]);
    expect(studioTaskCenterCopy("crop")).toEqual({
      label: "Tasks",
      title: "Tasks",
      description: "Background crop computations",
      emptyTitle: "No crop tasks yet",
      emptyMessage: "Long-running crop computations will appear here.",
    });
    expect(studioTaskCenterCopy("analysis")).toEqual({
      label: "Tasks",
      title: "Tasks",
      description: "Background analysis computations",
      emptyTitle: "No analysis tasks yet",
      emptyMessage: "Long-running analysis computations will appear here.",
    });
  });
});
