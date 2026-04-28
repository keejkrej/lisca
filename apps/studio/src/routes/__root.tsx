import { Navigate, Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import type { StudioRouterContext } from "../router";

export const Route = createRootRouteWithContext<StudioRouterContext>()({
  component: Outlet,
  notFoundComponent: () => <Navigate replace to="/choose-assay" />,
});
