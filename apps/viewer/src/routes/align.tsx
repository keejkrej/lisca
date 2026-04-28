import { createFileRoute } from "@tanstack/react-router";
import { ViewerApp } from "lisca/viewer/react";

export const Route = createFileRoute("/align")({
  component: AlignRoute,
});

function AlignRoute() {
  const { dataPort, hostPort } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  return (
    <ViewerApp
      dataPort={dataPort}
      hostPort={hostPort}
      mode="align"
      onModeChange={(mode) => {
        void navigate({ to: mode === "roi" ? "/roi" : "/align" });
      }}
    />
  );
}
