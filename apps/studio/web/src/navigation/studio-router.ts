import { Command, Route, Router, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { isBasicInfoDirty, studioWizardAtom } from "@lisca/client/atoms/studio-ui";
import { Schema } from "effect";

import { studioRegistry } from "../state/studio-registry";

export const StudioRoute = Route.union(
  {
    Assay: Route.make("/assay"),
    Onboarding: Route.make("/onboarding"),
    Metadata: Route.make("/metadata"),
    Align: Route.make("/align"),
    Annotate: Route.make("/annotate"),
    Analysis: Route.make("/analysis"),
    HelpUs: Route.make("/help-us"),
    NotFound: Route.make("/*"),
  },
  Route.redirect("/", () => ({ _tag: "Assay", params: {}, search: {} })),
);

export type StudioRouteValue = typeof StudioRoute.Type;

export type StudioRouteTo = "/assay" | "/metadata" | "/align" | "/annotate" | "/analysis";

export type StudioAnyRouteTo = StudioRouteTo | "/onboarding" | "/help-us";

const METADATA_PATH = "/metadata";

/** Unsaved Metadata only matters when leaving Metadata, not when arriving there. */
export function shouldGuardMetadataLeave(from: string, to: string, dirty: boolean): boolean {
  return dirty && from === METADATA_PATH && to !== METADATA_PATH;
}

export function studioRouteForPath(path: string): StudioRouteValue {
  switch (path) {
    case "/onboarding":
      return StudioRoute.Onboarding();
    case "/metadata":
      return StudioRoute.Metadata();
    case "/align":
      return StudioRoute.Align();
    case "/annotate":
      return StudioRoute.Annotate();
    case "/analysis":
      return StudioRoute.Analysis();
    case "/help-us":
      return StudioRoute.HelpUs();
    case "/assay":
    default:
      return StudioRoute.Assay();
  }
}

export function studioPathForRoute(route: StudioRouteValue): StudioAnyRouteTo {
  switch (route._tag) {
    case "Onboarding":
      return "/onboarding";
    case "Metadata":
      return "/metadata";
    case "Align":
      return "/align";
    case "Annotate":
      return "/annotate";
    case "Analysis":
      return "/analysis";
    case "HelpUs":
      return "/help-us";
    case "Assay":
    case "NotFound":
    default:
      return "/assay";
  }
}

export const StudioNavigationSharedSchema = Schema.Struct({
  pathname: Schema.String,
  routeTag: Schema.String,
  pendingLeaveTo: Schema.NullOr(Schema.String),
});

export type StudioNavigationShared = typeof StudioNavigationSharedSchema.Type;

export const StudioNavigationMessage = UiSchema.TaggedEnum({
  RouteChanged: { route: StudioRoute },
  Navigate: {
    to: Schema.String,
    replace: Schema.optional(Schema.Boolean),
    force: Schema.optional(Schema.Boolean),
  },
  ProceedLeave: {},
  CancelLeave: {},
});

export const StudioNavigationProvider = Html.component({
  name: "StudioNavigationProvider",
  props: Schema.Struct({
    initialRoute: StudioRoute,
  }),
  model: Schema.Struct({
    route: StudioRoute,
    pendingLeaveTo: Schema.NullOr(Schema.String),
  }),
  message: StudioNavigationMessage,
  shares: {
    schema: StudioNavigationSharedSchema,
    value: ({ model }) => ({
      pathname: studioPathForRoute(model.route),
      routeTag: model.route._tag,
      pendingLeaveTo: model.pendingLeaveTo,
    }),
    receives: ["Navigate", "ProceedLeave", "CancelLeave"],
  },
}).make({
  init: ($) => {
    const initial = $.props.initialRoute;
    if (initial._tag === "NotFound") {
      const assay = StudioRoute.Assay();
      return $.set({ route: assay, pendingLeaveTo: null }).run(
        Router.replace(StudioRoute, assay).pipe(Command.asNoop),
      );
    }
    return { route: initial, pendingLeaveTo: null };
  },
  update: {
    RouteChanged: ($, { route }) => {
      const resolvedRoute = route._tag === "NotFound" ? StudioRoute.Assay() : route;
      const currentPath = studioPathForRoute($.model.route);
      const nextPath = studioPathForRoute(resolvedRoute);
      if (nextPath === currentPath) {
        return route._tag === "NotFound"
          ? $.evolve({ route: resolvedRoute }).run(
              Router.replace(StudioRoute, resolvedRoute).pipe(Command.asNoop),
            )
          : $.evolve({ route: resolvedRoute });
      }
      if (
        shouldGuardMetadataLeave(
          currentPath,
          nextPath,
          isBasicInfoDirty(studioRegistry.get(studioWizardAtom)),
        )
      ) {
        return $.evolve({ pendingLeaveTo: nextPath }).run(
          Router.push(StudioRoute, $.model.route).pipe(Command.asNoop),
        );
      }
      if (route._tag === "NotFound") {
        return $.evolve({ route: resolvedRoute, pendingLeaveTo: null }).run(
          Router.replace(StudioRoute, resolvedRoute).pipe(Command.asNoop),
        );
      }
      return $.evolve({ route: resolvedRoute, pendingLeaveTo: null });
    },
    Navigate: ($, { to, replace, force }) => {
      const currentPath = studioPathForRoute($.model.route);
      if (
        !force &&
        shouldGuardMetadataLeave(
          currentPath,
          to,
          isBasicInfoDirty(studioRegistry.get(studioWizardAtom)),
        )
      ) {
        return $.evolve({ pendingLeaveTo: to });
      }
      const nextRoute = studioRouteForPath(to);
      const navCmd = replace
        ? Router.replace(StudioRoute, nextRoute).pipe(Command.asNoop)
        : Router.push(StudioRoute, nextRoute).pipe(Command.asNoop);
      return $.evolve({ route: nextRoute, pendingLeaveTo: null }).run(navCmd);
    },
    ProceedLeave: ($) => {
      const to = $.model.pendingLeaveTo;
      if (!to) return $.evolve({ pendingLeaveTo: null });
      const nextRoute = studioRouteForPath(to);
      return $.evolve({ route: nextRoute, pendingLeaveTo: null }).run(
        Router.push(StudioRoute, nextRoute).pipe(Command.asNoop),
      );
    },
    CancelLeave: ($) => $.evolve({ pendingLeaveTo: null }),
  },
  subscriptions: ({ model }) => [
    Router.subscription(StudioRoute, model.route, (route) =>
      StudioNavigationMessage.RouteChanged({ route }),
    ),
  ],
  parts: (_p, model) => ({
    route: model.route,
    pathname: studioPathForRoute(model.route),
    pendingLeaveTo: model.pendingLeaveTo,
  }),
});
