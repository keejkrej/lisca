import { createFileRoute } from "@tanstack/react-router";

import { AnnotatorDemo } from "../annotator-demo";

export const Route = createFileRoute("/")({
  component: AnnotatorDemo,
});
