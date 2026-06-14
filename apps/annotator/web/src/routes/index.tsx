import { createFileRoute } from "@tanstack/react-router";

import { AnnotatePage } from "../components/annotate-page";
import { AnnotatePageProvider } from "../state/annotate-page-context";

export const Route = createFileRoute("/")({
  component: AnnotatorRoute,
});

function AnnotatorRoute() {
  return (
    <AnnotatePageProvider>
      <AnnotatePage />
    </AnnotatePageProvider>
  );
}
