export type StudioTaskScope = "crop" | "analysis";

/** Align lists crop operations. Analysis lists analysis operations. */
export function studioTaskScopeForPath(pathname: string): StudioTaskScope | null {
  if (pathname === "/align") return "crop";
  if (pathname === "/analysis") return "analysis";
  return null;
}

export function operationMatchesStudioTaskScope(kind: string, scope: StudioTaskScope): boolean {
  if (scope === "crop") return kind === "crop-roi";
  return kind.startsWith("analysis/");
}

export function filterStudioTaskOperations<T extends { kind: string }>(
  operations: readonly T[],
  scope: StudioTaskScope,
): T[] {
  return operations.filter((operation) => operationMatchesStudioTaskScope(operation.kind, scope));
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
