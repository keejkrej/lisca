import { createLiscaWebApp } from "@lisca/web-app";

import { AnnotatorAtomsProvider } from "./components/annotator-atoms-provider";
import { AnnotatePage } from "./components/annotate-page";
import { AnnotatorWorkSessionGate } from "./components/annotator-work-session-gate";
import "./index.css";
import { AnnotatePageProvider } from "./state/annotate-page-context";

createLiscaWebApp({
  App: AnnotatorApp,
  defaultPort: 8766,
  appId: "annotator",
  AtomsProvider: AnnotatorAtomsProvider,
});

function AnnotatorApp() {
  return (
    <AnnotatorWorkSessionGate>
      <AnnotatePageProvider>
        <AnnotatePage />
      </AnnotatePageProvider>
    </AnnotatorWorkSessionGate>
  );
}
