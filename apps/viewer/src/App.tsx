import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from "@tanstack/react-router";
import { createTauriDesktopPorts } from "lisca/viewer/host-tauri";
import type { ViewerDataPort, ViewerHostPort } from "lisca/shared/contracts";
import { useMemo } from "react";

import { routeTree } from "./routeTree.gen";

const ports = createTauriDesktopPorts();

export interface ViewerRouterContext {
  dataPort: ViewerDataPort;
  hostPort: ViewerHostPort;
}

export function createViewerRouter(context: ViewerRouterContext) {
  return createRouter({
    routeTree,
    history: createHashHistory(),
    context,
  });
}

export type ViewerRouter = ReturnType<typeof createViewerRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: ViewerRouter;
  }
}

export default function App() {
  const router = useMemo(
    () => createViewerRouter({ dataPort: ports.dataPort, hostPort: ports.hostPort }),
    [],
  );

  return <RouterProvider router={router} />;
}
