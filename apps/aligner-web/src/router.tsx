import {
  Navigate,
  Outlet,
  createHashHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { RawPage } from "./pages/raw";
import { RoiPage } from "./pages/roi";
import { indexRedirectPath } from "./shell/mode";
import { ShellWorkspaceProvider } from "@lisca/ui";

export type AlignerRouterContext = Record<string, never>;

const rootRoute = createRootRouteWithContext<AlignerRouterContext>()({
  component: function RootLayout() {
    return (
      <ShellWorkspaceProvider>
        <Outlet />
      </ShellWorkspaceProvider>
    );
  },
  notFoundComponent: () => <Navigate replace to="/raw" />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({
      to: indexRedirectPath(typeof window === "undefined" ? null : window.sessionStorage),
    });
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
  context: {} as AlignerRouterContext,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
