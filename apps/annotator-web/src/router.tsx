import {
  Navigate,
  Outlet,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { RawPage } from "./pages/raw";
import { RoiPage } from "./pages/roi";

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: () => <Navigate replace to="/raw" />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/raw" });
  },
});

const rawRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/raw",
  component: RawPage,
});

const roiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/roi",
  component: RoiPage,
});

const routeTree = rootRoute.addChildren([indexRoute, rawRoute, roiRoute]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
