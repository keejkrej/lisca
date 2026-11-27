import { Html } from "@effect/ui/html";
import { HostFilePickerPort, LabelFreeClientPort } from "@lisca/instrument";
import { createLiscaWebApp, type LiscaWebAppConfig } from "@lisca/web-app";
import { Layer, Schema } from "effect";

import "./index.css";
import { annotatorHostOperations } from "./api/annotator-port";
import { AnnotatePage } from "./components/annotate-page";
import { annotatorLabelFreeClient } from "./components/annotator-header";
import { AnnotatorWorkSessionGate } from "./components/annotator-work-session-gate";
import { AnnotatePageProvider } from "./state/annotate-page-context";

const AnnotatorApp = Html.component({
  name: "AnnotatorApp",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) =>
    AnnotatorWorkSessionGate(h, {
      children: AnnotatePageProvider(h, {
        children: AnnotatePage(h, { props: {} }),
      }),
    }),
});

createLiscaWebApp<never>({
  App: AnnotatorApp as unknown as LiscaWebAppConfig<never>["App"],
  appId: "annotator",
  layer: Layer.mergeAll(
    Layer.succeed(HostFilePickerPort, annotatorHostOperations),
    Layer.succeed(LabelFreeClientPort, annotatorLabelFreeClient),
  ),
  probe: () => annotatorHostOperations.userHomeDirectory(),
});
