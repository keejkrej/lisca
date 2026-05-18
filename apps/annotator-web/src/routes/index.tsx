import { createFileRoute } from "@tanstack/react-router";

import { RoiPage } from "../components/roi-page";

export const Route = createFileRoute("/")({
  component: RoiPage,
});
