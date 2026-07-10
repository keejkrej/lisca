import { createFileRoute } from "@tanstack/solid-router";

import { AnnotatorDemo } from "../annotator-demo";

export const Route = createFileRoute("/")({
  component: AnnotatorDemo,
});