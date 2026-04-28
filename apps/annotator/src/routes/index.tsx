import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  DEFAULT_ANNOTATION_MODE,
  annotatorIndexRedirectPath,
} from "lisca/annotator/react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: annotatorIndexRedirectPath(
        typeof window === "undefined" ? null : window.sessionStorage,
      ),
      search: { annotationMode: DEFAULT_ANNOTATION_MODE },
    });
  },
});
