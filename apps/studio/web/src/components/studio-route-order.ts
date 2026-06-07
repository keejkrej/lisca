export const STUDIO_ROUTE_ORDER = ["assay", "info", "align", "annotate", "result"] as const;

export type StudioRouteId = (typeof STUDIO_ROUTE_ORDER)[number];

export function studioRouteIdFromPath(pathname: string): StudioRouteId {
  const id = pathname.replace(/^\//, "") || "assay";
  if ((STUDIO_ROUTE_ORDER as readonly string[]).includes(id)) {
    return id as StudioRouteId;
  }
  return "assay";
}

export function studioRouteIndex(routeId: StudioRouteId): number {
  return STUDIO_ROUTE_ORDER.indexOf(routeId);
}

export function studioNavTransitionType(
  currentPath: string,
  targetPath: string,
): "nav-forward" | "nav-back" {
  const current = studioRouteIndex(studioRouteIdFromPath(currentPath));
  const target = studioRouteIndex(studioRouteIdFromPath(targetPath));
  return target >= current ? "nav-forward" : "nav-back";
}
