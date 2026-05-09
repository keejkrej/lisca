import { createFileRoute } from "@tanstack/react-router";

import { ShellPage } from "../components/shell-page";

export const Route = createFileRoute("/align")({
  component: AlignPage,
});

function AlignPage() {
  return <ShellPage routeId="align" />;
}
