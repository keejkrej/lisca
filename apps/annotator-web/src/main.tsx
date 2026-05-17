import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { router } from "./router";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ShellThemeProvider>
        <ShellWorkspaceProvider>
          <RouterProvider router={router} />
        </ShellWorkspaceProvider>
      </ShellThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
