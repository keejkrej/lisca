import {
  Navigate,
  Outlet,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { AlignPage } from "./pages/align";
import { AssayPage } from "./pages/assay";
import { InfoPage } from "./pages/info";
import { InspectPage } from "./pages/inspect";
import { ResultPage } from "./pages/result";

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: () => <Navigate replace to="/assay" />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/assay" });
  },
});

const assayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assay",
  component: AssayPage,
});

const infoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/info",
  component: InfoPage,
});

const alignRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/align",
  component: AlignPage,
});

const inspectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inspect",
  component: InspectPage,
});

const resultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/result",
  component: ResultPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  assayRoute,
  infoRoute,
  alignRoute,
  inspectRoute,
  resultRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
