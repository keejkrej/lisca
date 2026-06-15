import { createFileRoute } from "@tanstack/react-router";

import { AnnotatorWorkSessionGate } from "../components/annotator-work-session-gate";
import { AnnotatePage } from "../components/annotate-page";
import { AnnotatePageProvider } from "../state/annotate-page-context";

export const Route = createFileRoute("/")({
  component: AnnotatorRoute,
});

function AnnotatorRoute() {
  return (
    <AnnotatorWorkSessionGate>
      <AnnotatePageProvider>
        <AnnotatePage />
      </AnnotatePageProvider>
    </AnnotatorWorkSessionGate>
  );
}
