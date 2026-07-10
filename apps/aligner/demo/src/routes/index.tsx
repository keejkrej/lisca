import { createFileRoute } from "@tanstack/solid-router";

import { AlignDemo } from "../align-demo";

export const Route = createFileRoute("/")({
  component: AlignDemo,
});