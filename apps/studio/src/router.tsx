import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from "@tanstack/react-router";
import type { ViewerDataPort } from "lisca/shared/contracts";
import { createTauriDesktopPorts } from "lisca/shared/host-tauri";
import { useMemo } from "react";

import { routeTree } from "./routeTree.gen";

export interface StudioRouterContext {
  dataPort: ViewerDataPort | null;
}

export function createStudioRouter(context: StudioRouterContext) {
  return createRouter({
    routeTree,
    history: createHashHistory(),
    context,
  });
}

export type StudioRouter = ReturnType<typeof createStudioRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: StudioRouter;
  }
}

export function StudioRouterProvider() {
  const dataPort = useMemo(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      return createTauriDesktopPorts().dataPort;
    }
    return null;
  }, []);

  const router = useMemo(() => createStudioRouter({ dataPort }), [dataPort]);

  return <RouterProvider router={router} />;
}
