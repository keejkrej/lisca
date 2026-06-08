import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

export type StudioRouteTo = "/assay" | "/info" | "/align" | "/annotate" | "/result";

export function studioNavigate(
  navigate: ReturnType<typeof useNavigate>,
  to: StudioRouteTo,
): void {
  void navigate({ to });
}

export function useStudioNavigate() {
  const navigate = useNavigate();

  const navigateTo = useCallback(
    (to: StudioRouteTo) => {
      studioNavigate(navigate, to);
    },
    [navigate],
  );

  return { navigate, navigateTo };
}
