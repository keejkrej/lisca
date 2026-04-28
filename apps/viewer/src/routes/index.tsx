import { createFileRoute, redirect } from "@tanstack/react-router";
import { viewerIndexRedirectPath } from "lisca/viewer/react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: viewerIndexRedirectPath(
        typeof window === "undefined" ? null : window.sessionStorage,
      ),
    });
  },
});
