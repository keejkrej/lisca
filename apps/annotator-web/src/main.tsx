import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ShellWorkspaceProvider } from "@lisca/ui";

import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ShellWorkspaceProvider>
      <App />
    </ShellWorkspaceProvider>
  </StrictMode>,
);
