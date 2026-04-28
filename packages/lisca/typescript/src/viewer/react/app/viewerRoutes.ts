import type { ViewerMode } from "./ViewerNavbar";

export type ViewerRoutePath = "/align" | "/roi";

export const LAST_VIEWER_MODE_KEY = "viewer.viewerMode";

export function parseViewerMode(value: unknown): ViewerMode | null {
  return value === "align" || value === "roi" ? value : null;
}

export function viewerModeToPath(mode: ViewerMode): ViewerRoutePath {
  return mode === "roi" ? "/roi" : "/align";
}

export function viewerPathToMode(path: string): ViewerMode | null {
  if (path === "/align") return "align";
  if (path === "/roi") return "roi";
  return null;
}

export function readStoredViewerMode(storage: Pick<Storage, "getItem"> | null | undefined): ViewerMode | null {
  if (!storage) return null;
  return parseViewerMode(storage.getItem(LAST_VIEWER_MODE_KEY));
}

export function viewerIndexRedirectPath(storage: Pick<Storage, "getItem"> | null | undefined): ViewerRoutePath {
  return viewerModeToPath(readStoredViewerMode(storage) ?? "align");
}
