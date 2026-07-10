import { createLiscaDemoApp } from "@lisca/web-demo";
import { createHashHistory, createRouter } from "@tanstack/solid-router";

import "./index.css";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree, history: createHashHistory() });

declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}

createLiscaDemoApp({ router });