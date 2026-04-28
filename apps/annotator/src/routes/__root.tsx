import { Navigate, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { DEFAULT_ANNOTATION_MODE } from "lisca/annotator/react";

import type { AnnotatorRouterContext } from "../App";

export const Route = createRootRouteWithContext<AnnotatorRouterContext>()({
  component: Outlet,
  notFoundComponent: () => (
    <Navigate
      replace
      to="/roi"
      search={{ annotationMode: DEFAULT_ANNOTATION_MODE }}
    />
  ),
});
