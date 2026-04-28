import { createFileRoute } from "@tanstack/react-router";
import {
  AnnotatorApp,
  validateAnnotationModeSearch,
  type AnnotatorDataMode,
} from "lisca/annotator/react";
import type { AnnotationMode } from "lisca/shared/contracts";

type AnnotatorSearch = {
  annotationMode: AnnotationMode;
};

export const Route = createFileRoute("/raw")({
  validateSearch: (search: Record<string, unknown>): AnnotatorSearch => ({
    annotationMode: validateAnnotationModeSearch(search.annotationMode),
  }),
  component: RawRoute,
});

function RawRoute() {
  const { dataPort, hostPort } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const navigateDataMode = (dataMode: AnnotatorDataMode) => {
    void navigate({
      to: dataMode === "raw" ? "/raw" : "/roi",
      search,
    });
  };

  const navigateAnnotationMode = (annotationMode: AnnotationMode) => {
    void navigate({
      to: "/raw",
      search: { annotationMode },
    });
  };

  return (
    <AnnotatorApp
      dataPort={dataPort}
      hostPort={hostPort}
      dataMode="raw"
      annotationMode={search.annotationMode}
      onDataModeChange={navigateDataMode}
      onAnnotationModeChange={navigateAnnotationMode}
    />
  );
}
