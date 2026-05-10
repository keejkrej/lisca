import {
  Navigate,
  Outlet,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { RoiPage } from "./pages/roi";

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: () => <Navigate replace to="/roi" />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/roi" });
  },
});

const roiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/roi",
  component: RoiPage,
});

const routeTree = rootRoute.addChildren([indexRoute, roiRoute]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
