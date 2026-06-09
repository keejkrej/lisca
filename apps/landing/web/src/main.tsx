import { ShellThemeProvider } from "@lisca/ui/shell";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ShellThemeProvider defaultMode="dark" storageKey="lisca-landing-theme">
      <App />
    </ShellThemeProvider>
  </StrictMode>,
);
