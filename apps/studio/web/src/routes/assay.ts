import { Command, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { forgetStudioAssay } from "@lisca/client/studio/wizard-memory";
import { CanvasToastStack, HostFilePickerDialog } from "@lisca/instrument";
import { AppShell } from "@lisca/ui/shell";
import { Effect, Schema } from "effect";

import { ChooseAssay } from "../components/choose-assay";
import { StudioAssayActions } from "../components/studio-assay-dock";
import { StudioLeft } from "../components/studio-left";
import {
  shouldGuardReplaceDocument,
  StudioReplaceDocumentGuard,
} from "../components/studio-replace-document-guard";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import { useStudioMemoryRecent } from "../hooks/use-studio-memory-recent";
import { StudioNavigationMessage, StudioNavigationProvider } from "../navigation/studio-router";
import { setStudioAtom, studioRegistry } from "../state/studio-registry";
import { getActiveStudioSession } from "../state/studio-session-context";
import { studioWizardActions, studioWizardAtom } from "../state/studio-store";
import { recordStudioAssayMemory } from "../utils/studio-memory";

const PendingReplaceSchema = Schema.NullOr(
  Schema.Union([
    Schema.Struct({ kind: Schema.Literal("new") }),
    Schema.Struct({ kind: Schema.Literal("open"), path: Schema.String }),
  ]),
);

const AssayPageMsg = UiSchema.TaggedEnum({
  OpenGuide: {},
  OpenFeedback: {},
  NewAssayRequested: {},
  OpenAssayPicker: {},
  PickerOpenChanged: { open: Schema.Boolean },
  PickAssayPath: { path: Schema.String },
  RemoveRecent: { path: Schema.String },
  ReplaceConfirmed: {},
  ReplaceCancelled: {},
  OpenAssaySucceeded: {},
  OpenAssayFailed: { error: Schema.String },
});

const OpenAssayCommand = Command.make(
  "StudioAssayPageOpenAssay",
  { args: { path: Schema.String } },
  ({ path }) =>
    Effect.tryPromise({
      try: async () => {
        const assayJson = await getActiveStudioSession().openAssay(path);
        recordStudioAssayMemory(path, assayJson);
      },
      catch: (cause) =>
        cause instanceof Error
          ? cause.message
          : "Could not open assay.json. Check the file and try again.",
    }).pipe(
      Effect.as(AssayPageMsg.OpenAssaySucceeded()),
      Effect.catch((error) => Effect.succeed(AssayPageMsg.OpenAssayFailed({ error }))),
    ),
);

function startNewAssay(): void {
  const currentAssayId = studioRegistry.get(studioWizardAtom).assayId;
  studioWizardActions.newAssay((update) => setStudioAtom(studioWizardAtom, update), currentAssayId);
}

export const AssayPage = Html.component({
  name: "AssayPage",
  props: Schema.Struct({}),
  model: Schema.Struct({
    openingAssay: Schema.Boolean,
    assayPickerOpen: Schema.Boolean,
    openAssayError: Schema.NullOr(Schema.String),
    recentRevision: Schema.Number,
    pendingReplace: PendingReplaceSchema,
  }),
  message: AssayPageMsg,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({
    openingAssay: false,
    assayPickerOpen: false,
    openAssayError: null,
    recentRevision: 0,
    pendingReplace: null,
  }),
  update: {
    OpenGuide: ($) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to: "/onboarding" })),
    OpenFeedback: ($) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to: "/help-us" })),
    NewAssayRequested: ($) => {
      if (shouldGuardReplaceDocument()) {
        return $.evolve({ pendingReplace: { kind: "new" as const } });
      }
      startNewAssay();
      return $.send(
        StudioNavigationProvider,
        StudioNavigationMessage.Navigate({ to: "/metadata" }),
      );
    },
    OpenAssayPicker: ($) => $.evolve({ assayPickerOpen: true }),
    PickerOpenChanged: ($, { open }) => $.evolve({ assayPickerOpen: open }),
    PickAssayPath: ($, { path }) => {
      if (shouldGuardReplaceDocument()) {
        return $.evolve({
          assayPickerOpen: false,
          pendingReplace: { kind: "open" as const, path },
        });
      }
      return $.evolve({
        assayPickerOpen: false,
        openingAssay: true,
        openAssayError: null,
      }).run(OpenAssayCommand.make({ path }));
    },
    RemoveRecent: ($, { path }) => {
      forgetStudioAssay(path);
      return $.evolve({ recentRevision: (r) => r + 1 });
    },
    ReplaceConfirmed: ($) => {
      const pending = $.model.pendingReplace;
      if (!pending) return $.model;
      if (pending.kind === "new") {
        startNewAssay();
        return $.evolve({ pendingReplace: null }).send(
          StudioNavigationProvider,
          StudioNavigationMessage.Navigate({ to: "/metadata" }),
        );
      }
      return $.evolve({
        pendingReplace: null,
        assayPickerOpen: false,
        openingAssay: true,
        openAssayError: null,
      }).run(OpenAssayCommand.make({ path: pending.path }));
    },
    ReplaceCancelled: ($) => $.evolve({ pendingReplace: null }),
    OpenAssaySucceeded: ($) =>
      $.evolve({ openingAssay: false, openAssayError: null }).send(
        StudioNavigationProvider,
        StudioNavigationMessage.Navigate({ to: "/metadata" }),
      ),
    OpenAssayFailed: ($, { error }) => $.evolve({ openingAssay: false, openAssayError: error }),
  },
  view: (h, model) => {
    void model.recentRevision;
    const assayRecent = useStudioMemoryRecent("assay", model.assayPickerOpen);

    return h.div.class("contents").children(
      AppShell(h, {
        key: "assay-shell",
        left: StudioLeft(h),
        leftWidthClass: "w-rail",
        topBar: StudioTopBar(h),
        main: [
          CanvasToastStack(h, {
            messages: model.openAssayError
              ? [{ text: model.openAssayError, tone: "error" as const }]
              : [],
          }),
          AppShell.MainScroll(h, {
            key: "assay-scroll",
            contentClass: "max-w-[52rem] items-center justify-center px-4 py-6 md:px-12 md:py-10",
            children: ChooseAssay(h, {
              key: "choose-assay",
              onOpenFeedback: AssayPageMsg.OpenFeedback(),
              onOpenGuide: AssayPageMsg.OpenGuide(),
            }),
          }),
        ],
        right: StudioRightPanel(h, {
          children: StudioAssayActions(h, {
            key: "assay-actions",
            assayPickerOpen: model.assayPickerOpen,
            openingAssay: model.openingAssay,
            onNewAssay: AssayPageMsg.NewAssayRequested(),
            onOpenAssay: AssayPageMsg.OpenAssayPicker(),
          }),
        }),
        rightWidthClass: "w-rail",
      }),
      HostFilePickerDialog(h, {
        key: "assay-file-picker",
        description: "Choose a saved assay.json to resume.",
        mode: "assay_json_file",
        open: model.assayPickerOpen,
        recentItems: assayRecent.assays.map((entry) => ({
          path: entry.path,
          label: entry.assayLabel,
        })),
        title: "Open existing assay",
        onOpenChange: (open) => AssayPageMsg.PickerOpenChanged({ open }),
        onPickDirectory: () => AssayPageMsg.PickerOpenChanged({ open: false }),
        onPickFile: (path) => AssayPageMsg.PickAssayPath({ path }),
        onPickRecent: (path) => AssayPageMsg.PickAssayPath({ path }),
        onRemoveRecent: (path) => AssayPageMsg.RemoveRecent({ path }),
      }),
      StudioReplaceDocumentGuard(h, {
        key: "assay-replace-guard",
        open: model.pendingReplace !== null,
        onConfirm: AssayPageMsg.ReplaceConfirmed(),
        onCancel: AssayPageMsg.ReplaceCancelled(),
      }),
    );
  },
});
