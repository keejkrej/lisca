import React from "react";
import ReactDOM from "react-dom/client";

import { LiscaQueryProvider } from "lisca/shared/query";
import { AnchoredToastProvider, ToastProvider } from "lisca/shared/react";

import "./index.css";

import { StudioRouterProvider } from "./router";

document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LiscaQueryProvider>
      <ToastProvider>
        <AnchoredToastProvider>
          <StudioRouterProvider />
        </AnchoredToastProvider>
      </ToastProvider>
    </LiscaQueryProvider>
  </React.StrictMode>,
);
