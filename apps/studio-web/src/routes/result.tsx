import { createFileRoute } from "@tanstack/react-router";

import { StudioShell } from "../components/studio-shell";

export const Route = createFileRoute("/result")({
  component: ResultPage,
});

function ResultPage() {
  return <StudioShell routeId="result" />;
}
