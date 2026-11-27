import { Html } from "@effect/ui/html";
import { Schema } from "effect";

import { StudioMetadataLeaveGuard } from "../components/studio-metadata-leave-guard";
import { StudioWorkSessionGate } from "../components/studio-work-session-gate";
import {
  StudioNavigationProvider,
  StudioRoute,
  studioRouteForPath,
  type StudioRouteValue,
} from "../navigation/studio-router";
import { AlignPage } from "./align";
import { AnalysisPage } from "./analysis";
import { AnnotatePage } from "./annotate";
import { AssayPage } from "./assay";
import { HelpUsPage } from "./help-us";
import { MetadataPage } from "./metadata";
import { OnboardingPage } from "./onboarding";

function readInitialStudioRoute(): StudioRouteValue {
  if (typeof window === "undefined") {
    return StudioRoute.Assay();
  }
  const rawHash = window.location.hash;
  if (!rawHash || rawHash === "#" || rawHash === "#/") {
    return StudioRoute.Assay();
  }
  const pathWithQuery = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
  const pathname = pathWithQuery.split("?")[0] ?? "/";
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/") {
    return StudioRoute.Assay();
  }
  return studioRouteForPath(normalized);
}

export const StudioApp = Html.component({
  name: "StudioApp",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) => {
    const initialRoute = readInitialStudioRoute();
    return StudioNavigationProvider(h, {
      key: "studio-navigation",
      props: { initialRoute },
      view: (nav) =>
        StudioWorkSessionGate(h, {
          key: "studio-work-session",
          children: [
            StudioMetadataLeaveGuard(h, { key: "studio-metadata-leave-guard" }),
            (() => {
              switch (nav.route._tag) {
                case "Onboarding":
                  return OnboardingPage(h, { key: "page-onboarding", props: {} });
                case "Metadata":
                  return MetadataPage(h, { key: "page-metadata", props: {} });
                case "Align":
                  return AlignPage(h, { key: "page-align", props: {} });
                case "Annotate":
                  return AnnotatePage(h, { key: "page-annotate", props: {} });
                case "Analysis":
                  return AnalysisPage(h, { key: "page-analysis", props: {} });
                case "HelpUs":
                  return HelpUsPage(h, { key: "page-help-us", props: {} });
                case "Assay":
                case "NotFound":
                default:
                  return AssayPage(h, { key: "page-assay", props: {} });
              }
            })(),
          ],
        }),
    });
  },
});
