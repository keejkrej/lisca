import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AlignerAtomsProvider } from "./components/aligner-atoms-provider";
import "./index.css";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AlignerAtomsProvider>
      <ShellThemeProvider>
        <ShellServerProvider defaultPort={8765}>
          <ShellWorkspaceProvider>
            <RouterProvider router={router} />
          </ShellWorkspaceProvider>
        </ShellServerProvider>
      </ShellThemeProvider>
    </AlignerAtomsProvider>
  </StrictMode>,
);
