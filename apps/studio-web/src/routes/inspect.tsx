import { createFileRoute } from "@tanstack/react-router";

import { StudioShell } from "../components/studio-shell";

export const Route = createFileRoute("/inspect")({
  component: InspectPage,
});

function InspectPage() {
  return <StudioShell routeId="inspect" />;
}
