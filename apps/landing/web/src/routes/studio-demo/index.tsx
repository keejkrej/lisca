import { AnalysisDemo } from "@lisca/studio-demo";
import { createFileRoute } from "@tanstack/solid-router";

import { DemoRoutePage } from "../../lib/demo-route-page";

export const Route = createFileRoute("/studio-demo/")({
  component: () => <DemoRoutePage Demo={AnalysisDemo} />,
});
