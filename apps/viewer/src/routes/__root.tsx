import { Navigate, Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import type { ViewerRouterContext } from "../App";

export const Route = createRootRouteWithContext<ViewerRouterContext>()({
  component: Outlet,
  notFoundComponent: () => <Navigate replace to="/align" />,
});
