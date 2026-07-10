import { createLiscaWebApp } from "@lisca/web-app";
import { createHashHistory, createRouter } from "@tanstack/solid-router";

import { AnnotatorAtomsProvider } from "./components/annotator-atoms-provider";
import "./index.css";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree, history: createHashHistory() });

declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}

createLiscaWebApp({
  router,
  defaultPort: 8766,
  appId: "annotator",
  AtomsProvider: AnnotatorAtomsProvider,
});