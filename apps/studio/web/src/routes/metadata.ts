import { Html } from "@effect/ui/html";
import { AppShell } from "@lisca/ui/shell";
import { Schema } from "effect";

import { MetadataFields } from "../components/metadata-fields";
import { MetadataSamples } from "../components/metadata-samples";
import { StudioLeft } from "../components/studio-left";
import { StudioMetadataActions } from "../components/studio-metadata-actions";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";

export const MetadataPage = Html.component({
  name: "MetadataPage",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) =>
    AppShell(h, {
      key: "metadata-shell",
      left: StudioLeft(h),
      leftWidthClass: "w-rail",
      topBar: StudioTopBar(h),
      main: AppShell.MainScroll(h, {
        key: "metadata-scroll",
        contentClass: "max-w-[52rem] items-center gap-10 px-4 py-6 md:px-12 md:py-10",
        children: [
          MetadataFields(h, { key: "metadata-fields" }),
          MetadataSamples(h, { key: "metadata-samples" }),
        ],
      }),
      right: StudioRightPanel(h, {
        children: StudioMetadataActions(h, { key: "metadata-actions" }),
      }),
      rightWidthClass: "w-rail",
    }),
});
