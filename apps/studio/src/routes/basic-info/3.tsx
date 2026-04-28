import { createFileRoute } from "@tanstack/react-router";

import StudioApp from "../../App";
import { studioStepToPath } from "../../studioRoutes";

export const Route = createFileRoute("/basic-info/3")({
  component: BasicInfoStep3Route,
});

function BasicInfoStep3Route() {
  const { dataPort } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  return (
    <StudioApp
      step="info3"
      dataPort={dataPort}
      onStepChange={(step) => {
        void navigate({ to: studioStepToPath(step) });
      }}
    />
  );
}
