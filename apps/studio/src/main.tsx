import React from "react";
import ReactDOM from "react-dom/client";

import { AnchoredToastProvider, ToastProvider } from "lisca/shared/react";
import "lisca/viewer/styles.css";

import "./index.css";

import App from "./App";

document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <AnchoredToastProvider>
        <App />
      </AnchoredToastProvider>
    </ToastProvider>
  </React.StrictMode>,
);
