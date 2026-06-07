import { createLiscaWebApp } from "@lisca/web-app";
import { createHashHistory, createRouter } from "@tanstack/react-router";

import { AlignerAtomsProvider } from "./components/aligner-atoms-provider";
import "./index.css";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree, history: createHashHistory() });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createLiscaWebApp({ router, defaultPort: 8765, AtomsProvider: AlignerAtomsProvider });
