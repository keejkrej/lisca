import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/annotate")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/annotate"!</div>;
}
