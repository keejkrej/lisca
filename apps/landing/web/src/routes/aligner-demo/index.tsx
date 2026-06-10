import { AlignDemo } from "@lisca/aligner-demo";
import { createFileRoute } from "@tanstack/react-router";

import { DemoRoutePage } from "../../lib/demo-route-page";

export const Route = createFileRoute("/aligner-demo/")({
  component: () => <DemoRoutePage Demo={AlignDemo} />,
});
