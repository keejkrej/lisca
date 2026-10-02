export type StudioTaskScope = "crop" | "analysis";

/**
 * Crop tasks sit on Annotate, the step that waits for cropping.
 * Analysis tasks sit on Analysis, the step that waits for analysis.
 */
export function studioTaskScopeForPath(pathname: string): StudioTaskScope | null {
  if (pathname === "/annotate") return "crop";
  if (pathname === "/analysis") return "analysis";
  return null;
}

export function taskMatchesStudioTaskScope(kind: string, scope: StudioTaskScope): boolean {
  if (scope === "crop") return kind === "crop-roi";
  return kind.startsWith("analysis/");
}

export function filterStudioTasks<T extends { kind: string }>(
  tasks: readonly T[],
  scope: StudioTaskScope,
): T[] {
  return tasks.filter((task) => taskMatchesStudioTaskScope(task.kind, scope));
}

export type StudioTaskCenterCopy = {
  label: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyMessage: string;
};

/** Visible Task Center copy for the page that owns this scope. */
export function studioTaskCenterCopy(scope: StudioTaskScope): StudioTaskCenterCopy {
  if (scope === "crop") {
    return {
      label: "Tasks",
      title: "Tasks",
      description: "Background crop computations",
      emptyTitle: "No crop tasks yet",
      emptyMessage: "Long-running crop computations will appear here.",
    };
  }
  return {
    label: "Tasks",
    title: "Tasks",
    description: "Background analysis computations",
    emptyTitle: "No analysis tasks yet",
    emptyMessage: "Long-running analysis computations will appear here.",
  };
}
