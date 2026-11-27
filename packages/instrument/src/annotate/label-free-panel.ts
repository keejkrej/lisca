import { Command, Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  LabelFreeClassificationSchema,
  LabelFreeHealthSchema,
  LabelFreeReferenceSetSchema,
  type LabelFreeClassification,
  type LabelFreeHealth,
  type LabelFreeReferenceSet,
} from "@lisca/contracts";
import { Button } from "@lisca/ui/button";
import { Field, FieldGroup, FieldLabel } from "@lisca/ui/field";
import { Input } from "@lisca/ui/input";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Context, Effect, Schema, Stream } from "effect";

export type LabelFreeClient = {
  health: () => Promise<LabelFreeHealth>;
  saveKey: (apiKey?: string, provider?: "openrouter" | "ollama") => Promise<LabelFreeHealth>;
  listReferences: (workspacePath: string) => Promise<LabelFreeReferenceSet[]>;
  buildReferences: (workspacePath: string, name: string) => Promise<LabelFreeReferenceSet>;
  classify: (
    workspacePath: string,
    name: string,
    limit?: number,
  ) => Promise<LabelFreeClassification[]>;
  formatError?: ((error: unknown, fallback: string) => string) | undefined;
};

/**
 * Runtime Label-free inference client provided to `LabelFreeReferencesPanel` and
 * `InferenceSettingsPanel` via Effect Layer.
 */
export const LabelFreeClientPort = Context.Reference<LabelFreeClient | null>(
  "lisca/LabelFreeClientPort",
  { defaultValue: () => null },
);

function formatClientError(client: LabelFreeClient, error: unknown, fallback: string): string {
  if (client.formatError) return client.formatError(error, fallback);
  return error instanceof Error ? error.message : fallback;
}

function nextUnusedReferenceName(base: string, sets: readonly LabelFreeReferenceSet[]): string {
  const trimmed = base.trim() || "annotations";
  const taken = new Set(sets.map((set) => set.name));
  if (!taken.has(trimmed)) return trimmed;
  const stem = trimmed.replace(/-\d+$/, "");
  let index = 2;
  while (taken.has(`${stem}-${index}`)) {
    index += 1;
  }
  return `${stem}-${index}`;
}

const ProviderSchema = Schema.Literals(["openrouter", "ollama"]);
type Provider = typeof ProviderSchema.Type;

const ProbeStateSchema = Schema.Literals(["unknown", "unconfigured", "ready", "error"]);

const ReferencesPanelMessage = UiSchema.TaggedEnum({
  ProbedUnconfigured: {
    provider: ProviderSchema,
    modelId: Schema.String,
  },
  ProbedReady: {
    provider: ProviderSchema,
    modelId: Schema.String,
    sets: Schema.Array(LabelFreeReferenceSetSchema),
  },
  ProbeFailed: {
    message: Schema.String,
  },
  SelectedSet: { name: Schema.String },
  TypedName: { value: Schema.String },
  ClickedBuild: {},
  BuiltReferences: { built: LabelFreeReferenceSetSchema },
  BuildFailed: { message: Schema.String },
  ClickedClassify: {},
  Classified: { rows: Schema.Array(LabelFreeClassificationSchema) },
  ClassifyFailed: { message: Schema.String },
});

type ReferencesPanelMsg = typeof ReferencesPanelMessage.Type;

const BuildReferencesCommand = Command.make(
  "LiscaLabelFreeBuildReferences",
  {
    args: {
      workspacePath: Schema.String,
      targetName: Schema.String,
    },
  },
  ({ workspacePath, targetName }) =>
    Effect.gen(function* () {
      const client = yield* LabelFreeClientPort;
      if (!client) {
        return ReferencesPanelMessage.BuildFailed({
          message: "Could not build the reference set.",
        });
      }
      return yield* Effect.tryPromise({
        try: () => client.buildReferences(workspacePath, targetName),
        catch: (error) => formatClientError(client, error, "Could not build the reference set."),
      }).pipe(
        Effect.map((built) => ReferencesPanelMessage.BuiltReferences({ built })),
        Effect.catch((message) => Effect.succeed(ReferencesPanelMessage.BuildFailed({ message }))),
      );
    }),
);

const ClassifyCommand = Command.make(
  "LiscaLabelFreeClassify",
  {
    args: {
      workspacePath: Schema.String,
      referenceName: Schema.String,
    },
  },
  ({ workspacePath, referenceName }) =>
    Effect.gen(function* () {
      const client = yield* LabelFreeClientPort;
      if (!client) {
        return ReferencesPanelMessage.ClassifyFailed({
          message: "Could not classify ROIs.",
        });
      }
      return yield* Effect.tryPromise({
        try: () => client.classify(workspacePath, referenceName),
        catch: (error) => formatClientError(client, error, "Could not classify ROIs."),
      }).pipe(
        Effect.map((rows) => ReferencesPanelMessage.Classified({ rows })),
        Effect.catch((message) =>
          Effect.succeed(ReferencesPanelMessage.ClassifyFailed({ message })),
        ),
      );
    }),
);

export const LabelFreeReferencesPanel = Html.component({
  name: "LabelFreeReferencesPanel",
  props: Schema.Struct({
    workspacePath: Schema.NullOr(Schema.String),
  }),
  model: Schema.Struct({
    state: ProbeStateSchema,
    provider: ProviderSchema,
    modelId: Schema.String,
    sets: Schema.Array(LabelFreeReferenceSetSchema),
    reference: Schema.NullOr(LabelFreeReferenceSetSchema),
    rows: Schema.Array(LabelFreeClassificationSchema),
    name: Schema.String,
    message: Schema.NullOr(Schema.String),
    busy: Schema.Boolean,
  }),
  message: ReferencesPanelMessage,
}).make({
  init: () => ({
    state: "unknown" as const,
    provider: "openrouter" as const,
    modelId: "google/gemini-embedding-2",
    sets: [],
    reference: null,
    rows: [],
    name: "annotations",
    message: null,
    busy: false,
  }),
  update: {
    ProbedUnconfigured: ($, { provider, modelId }) =>
      $.evolve({ state: "unconfigured" as const, provider, modelId }),
    ProbedReady: ($, { provider, modelId, sets }) => {
      const preferred =
        sets.find((set) => set.name === $.model.name) ?? sets[sets.length - 1] ?? null;
      return $.evolve({
        state: "ready" as const,
        provider,
        modelId,
        sets,
        reference: preferred,
      });
    },
    ProbeFailed: ($, { message }) => $.evolve({ state: "error" as const, message }),
    SelectedSet: ($, { name }) => {
      const chosen = $.model.sets.find((set) => set.name === name);
      if (!chosen) return $;
      return $.evolve({ reference: chosen, name: chosen.name });
    },
    TypedName: ($, { value }) => $.evolve({ name: value }),
    ClickedBuild: ($) => {
      const workspacePath = $.props.workspacePath?.trim();
      if (!workspacePath || $.model.busy) return $;
      const targetName = nextUnusedReferenceName($.model.name, $.model.sets);
      return $.evolve({
        busy: true,
        message: null,
        name: targetName !== $.model.name.trim() ? targetName : $.model.name,
      }).run(BuildReferencesCommand.make({ workspacePath, targetName }));
    },
    BuiltReferences: ($, { built }) => {
      const labels = built.labels.map((entry) => `${entry.label} ${entry.count}`).join(", ");
      return $.evolve({
        busy: false,
        sets: (prev) => [...prev.filter((item) => item.name !== built.name), built],
        reference: built,
        rows: [],
        message: `Saved ${built.count} reference frames as "${built.name}" (${labels}).`,
      });
    },
    BuildFailed: ($, { message }) => $.evolve({ busy: false, message }),
    ClickedClassify: ($) => {
      const workspacePath = $.props.workspacePath?.trim();
      const current = $.model.reference;
      if (!workspacePath || !current || $.model.busy) return $;
      return $.evolve({ busy: true, message: null }).run(
        ClassifyCommand.make({ workspacePath, referenceName: current.name }),
      );
    },
    Classified: ($, { rows }) =>
      $.evolve({
        busy: false,
        rows,
        message:
          rows.length === 0
            ? "Every ROI on this plane is already in the reference set."
            : `Classified ${rows.length} ROIs (saved to results/label_free_classifications.csv).`,
      }),
    ClassifyFailed: ($, { message }) => $.evolve({ busy: false, message }),
  },
  subscriptions: ({ props }) => [
    Subscription.make("label-free-probe", props.workspacePath ?? "", (workspacePath) =>
      Stream.fromEffect(
        Effect.gen(function* () {
          const client = yield* LabelFreeClientPort;
          if (!client) {
            return ReferencesPanelMessage.ProbeFailed({
              message: "Could not reach the server",
            });
          }
          return yield* Effect.tryPromise({
            try: async (): Promise<ReferencesPanelMsg> => {
              const health = await client.health();
              const provider: Provider = health.provider === "ollama" ? "ollama" : "openrouter";
              if (!health.configured) {
                return ReferencesPanelMessage.ProbedUnconfigured({
                  provider,
                  modelId: health.modelId,
                });
              }
              const trimmed = workspacePath.trim();
              const loaded = trimmed ? await client.listReferences(trimmed) : [];
              return ReferencesPanelMessage.ProbedReady({
                provider,
                modelId: health.modelId,
                sets: loaded,
              });
            },
            catch: (error) => formatClientError(client, error, "Could not reach the server"),
          }).pipe(
            Effect.catch((message) =>
              Effect.succeed(ReferencesPanelMessage.ProbeFailed({ message })),
            ),
          );
        }),
      ),
    ),
  ],
  view: (h, model) => {
    const providerLabel = model.provider === "ollama" ? "local Ollama" : "OpenRouter";

    return PanelSection(h, {
      appearance: "rail",
      title: "Label-free",
      children: RailControlStack(h).children(
        model.state === "unknown"
          ? h.p.class("text-sm text-muted-foreground").children("Checking embedding configuration.")
          : undefined,
        model.state === "unconfigured"
          ? h.p
              .class("text-sm text-muted-foreground")
              .children(
                `Add an OpenRouter API key in Settings → Inference (or switch to local Ollama) to embed label-free reference frames with ${model.modelId}.`,
              )
          : undefined,
        model.state === "ready"
          ? [
              h.p
                .class("text-sm text-muted-foreground")
                .children(
                  `Classification labels on Annotate become the reference set (${model.modelId} via ${providerLabel}).`,
                ),
              model.sets.length > 1
                ? h.label
                    .attr("for", "label-free-active-set")
                    .class("flex flex-col gap-1 text-sm")
                    .children(
                      "Active set",
                      h.select
                        .id("label-free-active-set")
                        .class("h-8 border border-input bg-background px-2 text-xs text-foreground")
                        .value(model.reference?.name ?? "")
                        .on("change", ({ value }) =>
                          ReferencesPanelMessage.SelectedSet({ name: value }),
                        )
                        .children(
                          ...model.sets.map((set) =>
                            h.option
                              .key(set.name)
                              .attr("value", set.name)
                              .children(`${set.name} (${set.count} frames)`),
                          ),
                        ),
                    )
                : undefined,
              h.label
                .attr("for", "label-free-reference-name")
                .class("flex flex-col gap-1 text-sm")
                .children(
                  "Reference name",
                  Input(h, {
                    id: "label-free-reference-name",
                    value: model.name,
                    onInput: (value) => ReferencesPanelMessage.TypedName({ value }),
                  }),
                ),
              Button(h, {
                class: "w-full justify-center",
                disabled: model.busy || !h.props.workspacePath?.trim(),
                size: "sm",
                type: "button",
                onPress: ReferencesPanelMessage.ClickedBuild(),
              }).children("Build from annotations"),
              Button(h, {
                class: "w-full justify-center",
                disabled: model.busy || !model.reference,
                size: "sm",
                type: "button",
                variant: "outline",
                onPress: ReferencesPanelMessage.ClickedClassify(),
              }).children("Classify other ROIs"),
              model.rows.length > 0
                ? h.ul
                    .class(
                      "flex max-h-48 flex-col gap-1 overflow-y-auto text-sm text-muted-foreground",
                    )
                    .children(
                      ...model.rows.map((row, index) =>
                        h.li
                          .key(`${row.pos}-${row.roi}-${row.time}-${index}`)
                          .children(
                            `Pos${row.pos} Roi${row.roi} ${row.labelId} (t=${row.time}, ${Math.round(row.support * 100)}%)`,
                          ),
                      ),
                    )
                : undefined,
            ]
          : undefined,
        model.message
          ? h.p
              .attr("role", "status")
              .class("text-sm text-muted-foreground")
              .children(model.message)
          : undefined,
      ),
    });
  },
});

const InferenceStatusSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("loading") }),
  Schema.Struct({ kind: Schema.Literal("ready"), health: LabelFreeHealthSchema }),
  Schema.Struct({ kind: Schema.Literal("error"), message: Schema.String }),
]);

const InferenceSettingsMessage = UiSchema.TaggedEnum({
  LoadedStatus: { status: InferenceStatusSchema },
  TypedApiKey: { value: Schema.String },
  ClickedSaveKey: {},
  SavedKey: { health: LabelFreeHealthSchema },
  SaveKeyFailed: { message: Schema.String },
  ClickedProvider: { provider: ProviderSchema },
  ChangedProvider: { provider: ProviderSchema, health: LabelFreeHealthSchema },
  ChangeProviderFailed: { message: Schema.String },
});

const LoadInferenceStatusCommand = Command.make("LiscaInferenceLoadStatus", { args: {} }, () =>
  Effect.gen(function* () {
    const client = yield* LabelFreeClientPort;
    if (!client) {
      return InferenceSettingsMessage.LoadedStatus({
        status: { kind: "error", message: "Could not reach the server" },
      });
    }
    return yield* Effect.tryPromise({
      try: async () => {
        const health = await client.health();
        if (health.apiVersion !== 1 || !["openrouter", "ollama"].includes(health.provider)) {
          return {
            kind: "error" as const,
            message: "The server returned an unknown inference provider.",
          };
        }
        return { kind: "ready" as const, health };
      },
      catch: (error) => formatClientError(client, error, "Could not reach the server"),
    }).pipe(
      Effect.map((status) => InferenceSettingsMessage.LoadedStatus({ status })),
      Effect.catch((message) =>
        Effect.succeed(
          InferenceSettingsMessage.LoadedStatus({
            status: { kind: "error", message },
          }),
        ),
      ),
    );
  }),
);

const SaveApiKeyCommand = Command.make(
  "LiscaInferenceSaveApiKey",
  { args: { apiKey: Schema.String } },
  ({ apiKey }) =>
    Effect.gen(function* () {
      const client = yield* LabelFreeClientPort;
      if (!client) {
        return InferenceSettingsMessage.SaveKeyFailed({
          message: "Could not save the OpenRouter API key.",
        });
      }
      return yield* Effect.tryPromise({
        try: () => client.saveKey(apiKey, "openrouter"),
        catch: (error) =>
          formatClientError(client, error, "Could not save the OpenRouter API key."),
      }).pipe(
        Effect.map((health) => InferenceSettingsMessage.SavedKey({ health })),
        Effect.catch((message) =>
          Effect.succeed(InferenceSettingsMessage.SaveKeyFailed({ message })),
        ),
      );
    }),
);

const SelectProviderCommand = Command.make(
  "LiscaInferenceSelectProvider",
  { args: { provider: ProviderSchema } },
  ({ provider }) =>
    Effect.gen(function* () {
      const client = yield* LabelFreeClientPort;
      if (!client) {
        return InferenceSettingsMessage.ChangeProviderFailed({
          message: "Could not change the embedding provider.",
        });
      }
      return yield* Effect.tryPromise({
        try: () => client.saveKey(undefined, provider),
        catch: (error) =>
          formatClientError(client, error, "Could not change the embedding provider."),
      }).pipe(
        Effect.map((health) => InferenceSettingsMessage.ChangedProvider({ provider, health })),
        Effect.catch((message) =>
          Effect.succeed(InferenceSettingsMessage.ChangeProviderFailed({ message })),
        ),
      );
    }),
);

export const InferenceSettingsPanel = Html.component({
  name: "InferenceSettingsPanel",
  props: Schema.Struct({}),
  model: Schema.Struct({
    status: InferenceStatusSchema,
    apiKey: Schema.String,
    saveMessage: Schema.NullOr(Schema.String),
    saving: Schema.Boolean,
  }),
  message: InferenceSettingsMessage,
}).make({
  init: ($) =>
    $.set({
      status: { kind: "loading" as const },
      apiKey: "",
      saveMessage: null,
      saving: false,
    }).run(LoadInferenceStatusCommand.make()),
  update: {
    LoadedStatus: ($, { status }) => $.evolve({ status }),
    TypedApiKey: ($, { value }) => $.evolve({ apiKey: value }),
    ClickedSaveKey: ($) => {
      if ($.model.saving) return $;
      return $.evolve({ saving: true, saveMessage: null }).run(
        SaveApiKeyCommand.make({ apiKey: $.model.apiKey }),
      );
    },
    SavedKey: ($, { health }) =>
      $.evolve({
        saving: false,
        status: { kind: "ready" as const, health },
        apiKey: "",
        saveMessage: health.configured
          ? "OpenRouter API key saved for this session."
          : "OpenRouter API key cleared.",
      }),
    SaveKeyFailed: ($, { message }) => $.evolve({ saving: false, saveMessage: message }),
    ClickedProvider: ($, { provider }) => {
      if ($.model.saving) return $;
      return $.evolve({ saving: true, saveMessage: null }).run(
        SelectProviderCommand.make({ provider }),
      );
    },
    ChangedProvider: ($, { provider, health }) =>
      $.evolve({
        saving: false,
        status: { kind: "ready" as const, health },
        saveMessage:
          provider === "ollama"
            ? "Using the local Ollama server at LISCA_OLLAMA_URL (default http://127.0.0.1:11434)."
            : "Using OpenRouter for label-free embeddings.",
      }),
    ChangeProviderFailed: ($, { message }) => $.evolve({ saving: false, saveMessage: message }),
  },
  view: (h, model) => {
    const health = model.status.kind === "ready" ? model.status.health : undefined;
    const errorMessage = model.status.kind === "error" ? model.status.message : undefined;
    const modelLabel = health
      ? `${health.modelId} (${health.dimensions} dimensions)`
      : "Checking...";

    return h.div.class("flex flex-col gap-4").children(
      health
        ? h.div
            .class("flex flex-col gap-2")
            .children(
              h.p
                .class("text-sm text-muted-foreground")
                .children(
                  `Label-free assays embed annotated reference frames and sample time series with ${health.modelId} via ${health.provider === "ollama" ? "local Ollama" : "OpenRouter"}.`,
                ),
              h.p
                .class("text-sm text-muted-foreground")
                .children(
                  health.provider === "ollama"
                    ? "Local inference needs no API key. Pull embeddinggemma-2 in Ollama before building a reference set."
                    : health.configured
                      ? "OpenRouter API key is configured."
                      : "No OpenRouter API key is configured yet. Enter a key below to enable label-free embedding.",
                ),
            )
        : errorMessage
          ? h.p.attr("role", "alert").class("text-sm text-muted-foreground").children(errorMessage)
          : h.p.class("text-sm text-muted-foreground").children("Checking inference status."),
      h.div
        .class("flex flex-col gap-1")
        .children(
          h.p.class("text-sm font-medium text-foreground").children("Embedding model"),
          h.p.class("text-sm text-muted-foreground").children(modelLabel),
        ),
      h.div
        .attr("aria-label", "Embedding provider")
        .class("flex gap-2")
        .children(
          Button(h, {
            disabled: model.saving,
            size: "sm",
            type: "button",
            variant: health?.provider === "openrouter" ? "default" : "outline",
            onPress: InferenceSettingsMessage.ClickedProvider({ provider: "openrouter" }),
          }).children("OpenRouter"),
          Button(h, {
            disabled: model.saving,
            size: "sm",
            type: "button",
            variant: health?.provider === "ollama" ? "default" : "outline",
            onPress: InferenceSettingsMessage.ClickedProvider({ provider: "ollama" }),
          }).children("Local Ollama"),
        ),
      health?.provider !== "ollama"
        ? [
            FieldGroup(h, { class: "gap-3" }).children(
              Field(h).children(
                FieldLabel(h, { for: "inference-settings-openrouter-key" }).children(
                  "OpenRouter API key",
                ),
                Input(h, {
                  id: "inference-settings-openrouter-key",
                  placeholder: "sk-or-v1-...",
                  type: "password",
                  value: model.apiKey,
                  onInput: (value) => InferenceSettingsMessage.TypedApiKey({ value }),
                }).attr("autocomplete", "off"),
              ),
            ),
            Button(h, {
              class: "self-start",
              disabled: model.saving,
              type: "button",
              variant: "outline",
              onPress: InferenceSettingsMessage.ClickedSaveKey(),
            }).children("Save API key"),
          ]
        : undefined,
      model.saveMessage
        ? h.p
            .attr("role", "status")
            .class("text-sm text-muted-foreground")
            .children(model.saveMessage)
        : undefined,
    );
  },
});
