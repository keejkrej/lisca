import { AlignDemo } from "@lisca/aligner-demo";
import { createFileRoute } from "@tanstack/solid-router";

import { DemoRoutePage } from "../../lib/demo-route-page";

export const Route = createFileRoute("/aligner-demo/")({
  component: () => <DemoRoutePage Demo={AlignDemo} />,
});
