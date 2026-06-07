import { useNavigate, useRouterState } from "@tanstack/react-router";
import { addTransitionType, startTransition, useCallback } from "react";

import { studioNavTransitionType } from "../components/studio-route-order";

export type StudioRouteTo = "/assay" | "/info" | "/align" | "/annotate" | "/result";

export function studioNavigateWithTransition(
  navigate: ReturnType<typeof useNavigate>,
  currentPath: string,
  to: StudioRouteTo,
): void {
  startTransition(() => {
    addTransitionType(studioNavTransitionType(currentPath, to));
    void navigate({ to });
  });
}

export function useStudioNavigate() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname }) ?? "/assay";

  const navigateTo = useCallback(
    (to: StudioRouteTo) => {
      studioNavigateWithTransition(navigate, pathname, to);
    },
    [navigate, pathname],
  );

  return { navigate, navigateTo, pathname };
}
