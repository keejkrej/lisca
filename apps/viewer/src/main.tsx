import React from "react";
import ReactDOM from "react-dom/client";

import { LiscaQueryProvider } from "lisca/shared/query";
import "./fonts.css";
import "lisca/viewer/styles.css";

import App from "./App";

document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LiscaQueryProvider>
      <App />
    </LiscaQueryProvider>
  </React.StrictMode>,
);
