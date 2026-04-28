import { createFileRoute } from "@tanstack/react-router";

import StudioApp from "../../App";
import { studioStepToPath } from "../../studioRoutes";

export const Route = createFileRoute("/basic-info/2")({
  component: BasicInfoStep2Route,
});

function BasicInfoStep2Route() {
  const { dataPort } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  return (
    <StudioApp
      step="info2"
      dataPort={dataPort}
      onStepChange={(step) => {
        void navigate({ to: studioStepToPath(step) });
      }}
    />
  );
}
