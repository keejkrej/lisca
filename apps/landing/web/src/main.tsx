import { ShellThemeProvider } from "@lisca/ui/shell";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ShellThemeProvider defaultMode="dark" storageKey="lisca-landing-theme">
      <RouterProvider router={router} />
    </ShellThemeProvider>
  </StrictMode>,
);
