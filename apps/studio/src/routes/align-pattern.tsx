import { createFileRoute } from "@tanstack/react-router";

import StudioApp from "../App";
import { studioStepToPath } from "../studioRoutes";

export const Route = createFileRoute("/align-pattern")({
  component: AlignPatternRoute,
});

function AlignPatternRoute() {
  const { dataPort } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  return (
    <StudioApp
      step="alignPattern"
      dataPort={dataPort}
      onStepChange={(step) => {
        void navigate({ to: studioStepToPath(step) });
      }}
    />
  );
}
