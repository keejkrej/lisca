import { createFileRoute } from "@tanstack/react-router";

import StudioApp from "../App";
import { studioStepToPath } from "../studioRoutes";

export const Route = createFileRoute("/choose-assay")({
  component: ChooseAssayRoute,
});

function ChooseAssayRoute() {
  const { dataPort } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  return (
    <StudioApp
      step="welcome"
      dataPort={dataPort}
      onStepChange={(step) => {
        void navigate({ to: studioStepToPath(step) });
      }}
    />
  );
}
