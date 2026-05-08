import { RouterProvider } from "@tanstack/react-router";
import { ShellThemeProvider } from "@lisca/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { router } from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ShellThemeProvider>
      <RouterProvider router={router} />
    </ShellThemeProvider>
  </StrictMode>,
);
