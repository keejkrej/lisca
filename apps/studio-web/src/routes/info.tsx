import { createFileRoute } from "@tanstack/react-router";

import { StudioShell } from "../components/studio-shell";

export const Route = createFileRoute("/info")({
  component: InfoPage,
});

function InfoPage() {
  return <StudioShell routeId="info" />;
}
