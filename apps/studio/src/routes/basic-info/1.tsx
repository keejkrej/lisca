import { createFileRoute } from "@tanstack/react-router";

import StudioApp from "../../App";
import { studioStepToPath } from "../../studioRoutes";

export const Route = createFileRoute("/basic-info/1")({
  component: BasicInfoStep1Route,
});

function BasicInfoStep1Route() {
  const { dataPort } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  return (
    <StudioApp
      step="info1"
      dataPort={dataPort}
      onStepChange={(step) => {
        void navigate({ to: studioStepToPath(step) });
      }}
    />
  );
}
