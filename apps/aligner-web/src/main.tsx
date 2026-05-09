import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import { ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

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
    <ShellThemeProvider>
      <ShellWorkspaceProvider>
        <RouterProvider router={router} />
      </ShellWorkspaceProvider>
    </ShellThemeProvider>
  </StrictMode>,
);
