import { AnnotatorDemo } from "@lisca/annotator-demo";
import { createFileRoute } from "@tanstack/solid-router";

import { DemoRoutePage } from "../../lib/demo-route-page";

export const Route = createFileRoute("/annotator-demo/")({
  component: () => <DemoRoutePage Demo={AnnotatorDemo} />,
});