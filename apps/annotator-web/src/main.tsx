import { createLiscaWebApp } from "@lisca/web-app";
import { createHashHistory, createRouter } from "@tanstack/react-router";

import { AnnotatorAtomsProvider } from "./components/annotator-atoms-provider";
import "./index.css";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree, history: createHashHistory() });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createLiscaWebApp({ router, defaultPort: 8766, AtomsProvider: AnnotatorAtomsProvider });
