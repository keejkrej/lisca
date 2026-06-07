import { RouteLoadingFallback } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";

import { AnnotatePage } from "../components/annotate-page";
import { AnnotatePageProvider } from "../state/annotate-page-context";

export const Route = createFileRoute("/")({
  component: AnnotatorRoute,
  pendingComponent: RouteLoadingFallback,
  pendingMs: 0,
});

function AnnotatorRoute() {
  return (
    <AnnotatePageProvider>
      <AnnotatePage />
    </AnnotatePageProvider>
  );
}
