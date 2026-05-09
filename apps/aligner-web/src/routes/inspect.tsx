import { createFileRoute } from "@tanstack/react-router";

import { ShellPage } from "../components/shell-page";

export const Route = createFileRoute("/inspect")({
  component: InspectPage,
});

function InspectPage() {
  return <ShellPage routeId="inspect" />;
}
