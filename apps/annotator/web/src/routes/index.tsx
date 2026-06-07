import { RouteLoadingFallback } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";

import { RoiPage } from "../components/roi-page";
import { RoiPageProvider } from "../state/roi-page-context";

export const Route = createFileRoute("/")({
  component: AnnotatorRoute,
  pendingComponent: RouteLoadingFallback,
  pendingMs: 0,
});

function AnnotatorRoute() {
  return (
    <RoiPageProvider>
      <RoiPage />
    </RoiPageProvider>
  );
}
