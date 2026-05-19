import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

const queryClient = new QueryClient();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ShellThemeProvider>
        <ShellServerProvider defaultPort={8767}>
          <ShellWorkspaceProvider>
            <RouterProvider router={router} />
          </ShellWorkspaceProvider>
        </ShellServerProvider>
      </ShellThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
