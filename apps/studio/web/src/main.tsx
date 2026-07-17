import { createLiscaWebApp } from "@lisca/web-app";
import { createHashHistory, createRouter, RouterProvider } from "@tanstack/solid-router";

import { StudioAtomsProvider } from "./components/studio-atoms-provider";
import "./index.css";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree, history: createHashHistory() });

declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}

createLiscaWebApp({
  App: () => <RouterProvider router={router} />,
  defaultPort: 8767,
  appId: "studio",
  AtomsProvider: StudioAtomsProvider,
});
