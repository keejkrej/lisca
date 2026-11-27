import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { HostFilePickerPort } from "@lisca/instrument";
import { AppShell } from "@lisca/ui/shell";
import { createLiscaWebApp, type LiscaWebAppConfig } from "@lisca/web-app";
import { Layer, Schema } from "effect";

import { alignerHostOperations } from "./api/aligner-port";
import { AlignerHeader } from "./components/aligner-header";
import { AlignerLeft } from "./components/aligner-left";
import { AlignerMain } from "./components/aligner-main";
import { AlignerRight } from "./components/aligner-right";
import { AlignerWorkSessionGate } from "./components/aligner-work-session-gate";
import "./index.css";
import { AlignPageProvider } from "./state/align-page-context";

const AlignAppMessage = UiSchema.TaggedEnum({
  Noop: {},
});

const AlignApp = Html.component({
  name: "AlignApp",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: AlignAppMessage,
}).make({
  init: () => ({}),
  update: {
    Noop: ($) => $.model,
  },
  view: (h) =>
    AlignerWorkSessionGate(h, {
      children: AlignPageProvider(h, {
        children: AppShell(h, {
          left: AlignerLeft(h, { props: {} }),
          topBar: AlignerHeader(h, { props: {} }),
          main: AlignerMain(h, { props: {} }),
          right: AlignerRight(h, { props: {} }),
        }),
      }),
    }),
});

createLiscaWebApp({
  // ShellThemeProvider, ShellServerProvider, and ShellWorkspaceProvider are mounted by createLiscaWebApp.
  App: AlignApp as unknown as LiscaWebAppConfig["App"],
  appId: "aligner",
  layer: Layer.succeed(HostFilePickerPort, alignerHostOperations),
  probe: () => alignerHostOperations.userHomeDirectory(),
});
