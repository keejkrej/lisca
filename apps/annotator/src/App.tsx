import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from "@tanstack/react-router";
import { createTauriDesktopPorts } from "lisca/annotator/host-tauri";
import type { ViewerDataPort, ViewerHostPort } from "lisca/shared/contracts";
import { useMemo } from "react";

import { routeTree } from "./routeTree.gen";

const ports = createTauriDesktopPorts();

export interface AnnotatorRouterContext {
  dataPort: ViewerDataPort;
  hostPort: ViewerHostPort;
}

export function createAnnotatorRouter(context: AnnotatorRouterContext) {
  return createRouter({
    routeTree,
    history: createHashHistory(),
    context,
  });
}

export type AnnotatorRouter = ReturnType<typeof createAnnotatorRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AnnotatorRouter;
  }
}

export default function App() {
  const router = useMemo(
    () => createAnnotatorRouter({ dataPort: ports.dataPort, hostPort: ports.hostPort }),
    [],
  );

  return <RouterProvider router={router} />;
}
