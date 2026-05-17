import { createFileRoute } from "@tanstack/react-router";

import { StudioShell } from "../components/studio-shell";

export const Route = createFileRoute("/assay")({
  component: AssayPage,
});

function AssayPage() {
  return <StudioShell routeId="assay" />;
}
