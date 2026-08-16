import { useNavigate } from "@tanstack/solid-router";

export type StudioRouteTo = "/assay" | "/info" | "/align" | "/annotate" | "/result";

export function studioNavigate(navigate: ReturnType<typeof useNavigate>, to: StudioRouteTo): void {
  void navigate({
    to,
  });
}

export function useStudioNavigate() {
  const navigate = useNavigate();
  const navigateTo = (to: StudioRouteTo) => {
    studioNavigate(navigate, to);
  };
  return {
    navigate,
    navigateTo,
  };
}
