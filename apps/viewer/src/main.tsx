import React from "react";
import ReactDOM from "react-dom/client";

import "lisca/viewer/styles.css";

import App from "./App";

document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
