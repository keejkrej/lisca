import { createFileRoute } from "@tanstack/react-router";

import { AlignDemo } from "../align-demo";

export const Route = createFileRoute("/")({
  component: AlignDemo,
});
