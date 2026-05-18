import { createFileRoute } from "@tanstack/react-router";

import { RoiPage } from "../components/panels";

export const Route = createFileRoute("/")({
  component: RoiPage,
});
