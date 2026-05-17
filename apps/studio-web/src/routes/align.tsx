import { createFileRoute } from "@tanstack/react-router";

import { StudioShell } from "../components/studio-shell";

export const Route = createFileRoute("/align")({
  component: AlignPage,
});

function AlignPage() {
  return <StudioShell routeId="align" />;
}
