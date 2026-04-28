import { createFileRoute } from "@tanstack/react-router";
import { ViewerApp } from "lisca/viewer/react";

export const Route = createFileRoute("/roi")({
  component: RoiRoute,
});

function RoiRoute() {
  const { dataPort, hostPort } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  return (
    <ViewerApp
      dataPort={dataPort}
      hostPort={hostPort}
      mode="roi"
      onModeChange={(mode) => {
        void navigate({ to: mode === "roi" ? "/roi" : "/align" });
      }}
    />
  );
}
