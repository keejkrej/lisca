import { createFileRoute, redirect } from "@tanstack/solid-router";

import { studioMockAssayPath } from "../api/studio-mock";
import { readStudioOnboarding } from "../state/studio-onboarding";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!studioMockAssayPath() && !readStudioOnboarding().completed) {
      throw redirect({ to: "/onboarding" });
    }
    throw redirect({ to: "/assay" });
  },
});
