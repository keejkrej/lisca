import type {
  LabelFreeClassification,
  LabelFreeHealth,
  LabelFreeReferenceSet,
} from "@lisca/contracts";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button, Field, FieldGroup, FieldLabel, Input } from "@lisca/ui/primitives";
import { createEffect, createResource, createSignal, For, Match, Show, Switch } from "solid-js";

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
  formatError?: (error: unknown, fallback: string) => string;
};

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

type ProbeState = "unknown" | "unconfigured" | "ready" | "error";

export function LabelFreeReferencesPanel(props: {
  client: LabelFreeClient;
  workspacePath: string | null;
}) {
  const [state, setState] = createSignal<ProbeState>("unknown");
  const [provider, setProvider] = createSignal<"openrouter" | "ollama">("openrouter");
  const [modelId, setModelId] = createSignal("google/gemini-embedding-2");
  const [sets, setSets] = createSignal<LabelFreeReferenceSet[]>([]);
  const [reference, setReference] = createSignal<LabelFreeReferenceSet | null>(null);
  const [rows, setRows] = createSignal<LabelFreeClassification[]>([]);
  const [name, setName] = createSignal("annotations");
  const [message, setMessage] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  const probe = async (workspacePath: string | null) => {
    try {
      const health = await props.client.health();
      setModelId(health.modelId);
      setProvider(health.provider === "ollama" ? "ollama" : "openrouter");
      if (!health.configured) {
        setState("unconfigured");
        return;
      }
      setState("ready");
      const trimmed = workspacePath?.trim();
      if (!trimmed) {
        setSets([]);
        setReference(null);
        return;
      }
      const loaded = await props.client.listReferences(trimmed);
      setSets(loaded);
      const preferred =
        loaded.find((set) => set.name === name()) ?? loaded[loaded.length - 1] ?? null;
      setReference(preferred);
    } catch (error) {
      setState("error");
      setMessage(formatClientError(props.client, error, "Could not reach the server"));
    }
  };

  createEffect(() => {
    const ws = props.workspacePath ?? null;
    void probe(ws);
  });

  const buildReferences = async () => {
    const workspacePath = props.workspacePath?.trim();
    if (!workspacePath) return;
    setBusy(true);
    setMessage(null);
    try {
      const targetName = nextUnusedReferenceName(name(), sets());
      if (targetName !== name().trim()) {
        setName(targetName);
      }
      const built = await props.client.buildReferences(workspacePath, targetName);
      setSets((prev) => [...prev.filter((item) => item.name !== built.name), built]);
      setReference(built);
      setRows([]);
      const labels = built.labels.map((entry) => `${entry.label} ${entry.count}`).join(", ");
      setMessage(`Saved ${built.count} reference frames as "${built.name}" (${labels}).`);
    } catch (error) {
      setMessage(formatClientError(props.client, error, "Could not build the reference set."));
    } finally {
      setBusy(false);
    }
  };

  const classify = async () => {
    const workspacePath = props.workspacePath?.trim();
    const current = reference();
    if (!workspacePath || !current) return;
    setBusy(true);
    setMessage(null);
    try {
      const classified = await props.client.classify(workspacePath, current.name);
      setRows(classified);
      setMessage(
        classified.length === 0
          ? "Every ROI on this plane is already in the reference set."
          : `Classified ${classified.length} ROIs (saved to results/label_free_classifications.csv).`,
      );
    } catch (error) {
      setMessage(formatClientError(props.client, error, "Could not classify ROIs."));
    } finally {
      setBusy(false);
    }
  };

  const providerLabel = () => (provider() === "ollama" ? "local Ollama" : "OpenRouter");

  return (
    <PanelSection appearance="rail" title="Label-free">
      <RailControlStack>
        <Show when={state() === "unknown"}>
          <p class="text-sm text-muted-foreground">Checking embedding configuration.</p>
        </Show>
        <Show when={state() === "unconfigured"}>
          <p class="text-sm text-muted-foreground">
            Add an OpenRouter API key in Settings → Inference (or switch to local Ollama) to embed
            label-free reference frames with {modelId()}.
          </p>
        </Show>
        <Show when={state() === "ready"}>
          <p class="text-sm text-muted-foreground">
            Classification labels on Annotate become the reference set ({modelId()} via{" "}
            {providerLabel()}).
          </p>
          <Show when={sets().length > 1}>
            <label class="flex flex-col gap-1 text-sm" for="label-free-active-set">
              Active set
              <select
                class="h-8 border border-input bg-background px-2 text-xs text-foreground"
                id="label-free-active-set"
                value={reference()?.name ?? ""}
                onChange={(event) => {
                  const chosen = sets().find((set) => set.name === event.currentTarget.value);
                  if (chosen) {
                    setReference(chosen);
                    setName(chosen.name);
                  }
                }}
              >
                <For each={sets()}>
                  {(set) => (
                    <option value={set.name}>
                      {set.name} ({set.count} frames)
                    </option>
                  )}
                </For>
              </select>
            </label>
          </Show>
          <label class="flex flex-col gap-1 text-sm" for="label-free-reference-name">
            Reference name
            <Input
              id="label-free-reference-name"
              value={name()}
              onInput={(event) => setName(event.currentTarget.value)}
            />
          </label>
          <Button
            class="w-full justify-center"
            disabled={busy() || !props.workspacePath?.trim()}
            size="sm"
            type="button"
            onClick={() => void buildReferences()}
          >
            Build from annotations
          </Button>
          <Button
            class="w-full justify-center"
            disabled={busy() || !reference()}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void classify()}
          >
            Classify other ROIs
          </Button>
          <Show when={rows().length > 0}>
            <ul class="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm text-muted-foreground">
              <For each={rows()}>
                {(row) => (
                  <li>
                    Pos{row.pos} Roi{row.roi} {row.labelId} (t={row.time},{" "}
                    {Math.round(row.support * 100)}%)
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
        <Show when={message()}>
          <p class="text-sm text-muted-foreground" role="status">
            {message()}
          </p>
        </Show>
      </RailControlStack>
    </PanelSection>
  );
}

type InferenceStatus =
  | { kind: "ready"; health: LabelFreeHealth }
  | { kind: "error"; message: string };

export function InferenceSettingsPanel(props: { client: LabelFreeClient }) {
  const [status, { mutate }] = createResource(async (): Promise<InferenceStatus> => {
    try {
      const health = await props.client.health();
      if (health.apiVersion !== 1 || !["openrouter", "ollama"].includes(health.provider)) {
        return {
          kind: "error",
          message: "The server returned an unknown inference provider.",
        };
      }
      return { kind: "ready", health };
    } catch (error) {
      return {
        kind: "error",
        message: formatClientError(props.client, error, "Could not reach the server"),
      };
    }
  });
  const [apiKey, setApiKey] = createSignal("");
  const [saveMessage, setSaveMessage] = createSignal<string | null>(null);
  const [saving, setSaving] = createSignal(false);

  const labelFreeHealth = () => {
    const current = status();
    return current?.kind === "ready" ? current.health : undefined;
  };
  const errorMessage = () => {
    const current = status();
    return current?.kind === "error" ? current.message : undefined;
  };
  const modelLabel = () => {
    const health = labelFreeHealth();
    return health ? `${health.modelId} (${health.dimensions} dimensions)` : "Checking...";
  };

  const saveKey = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await props.client.saveKey(apiKey(), "openrouter");
      mutate({ kind: "ready", health: updated });
      setApiKey("");
      setSaveMessage(
        updated.configured
          ? "OpenRouter API key saved for this session."
          : "OpenRouter API key cleared.",
      );
    } catch (error) {
      setSaveMessage(
        formatClientError(props.client, error, "Could not save the OpenRouter API key."),
      );
    } finally {
      setSaving(false);
    }
  };

  const selectProvider = async (provider: "openrouter" | "ollama") => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await props.client.saveKey(undefined, provider);
      mutate({ kind: "ready", health: updated });
      setSaveMessage(
        provider === "ollama"
          ? "Using the local Ollama server at LISCA_OLLAMA_URL (default http://127.0.0.1:11434)."
          : "Using OpenRouter for label-free embeddings.",
      );
    } catch (error) {
      setSaveMessage(
        formatClientError(props.client, error, "Could not change the embedding provider."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="flex flex-col gap-4">
      <Switch fallback={<p class="text-sm text-muted-foreground">Checking inference status.</p>}>
        <Match when={labelFreeHealth()}>
          {(health) => (
            <div class="flex flex-col gap-2">
              <p class="text-sm text-muted-foreground">
                Label-free assays embed annotated reference frames and sample time series with{" "}
                {health().modelId} via{" "}
                {health().provider === "ollama" ? "local Ollama" : "OpenRouter"}.
              </p>
              <p class="text-sm text-muted-foreground">
                {health().provider === "ollama"
                  ? "Local inference needs no API key. Pull embeddinggemma-2 in Ollama before building a reference set."
                  : health().configured
                    ? "OpenRouter API key is configured."
                    : "No OpenRouter API key is configured yet. Enter a key below to enable label-free embedding."}
              </p>
            </div>
          )}
        </Match>
        <Match when={errorMessage()}>
          {(message) => (
            <p class="text-sm text-muted-foreground" role="alert">
              {message()}
            </p>
          )}
        </Match>
      </Switch>
      <div class="flex flex-col gap-1">
        <p class="text-sm font-medium text-foreground">Embedding model</p>
        <p class="text-sm text-muted-foreground">{modelLabel()}</p>
      </div>
      <div class="flex gap-2" aria-label="Embedding provider">
        <Button
          disabled={saving()}
          size="sm"
          type="button"
          variant={labelFreeHealth()?.provider === "openrouter" ? "default" : "outline"}
          onClick={() => void selectProvider("openrouter")}
        >
          OpenRouter
        </Button>
        <Button
          disabled={saving()}
          size="sm"
          type="button"
          variant={labelFreeHealth()?.provider === "ollama" ? "default" : "outline"}
          onClick={() => void selectProvider("ollama")}
        >
          Local Ollama
        </Button>
      </div>
      <Show when={labelFreeHealth()?.provider !== "ollama"}>
        <FieldGroup class="gap-3">
          <Field>
            <FieldLabel for="inference-settings-openrouter-key">OpenRouter API key</FieldLabel>
            <Input
              autocomplete="off"
              id="inference-settings-openrouter-key"
              placeholder="sk-or-v1-..."
              type="password"
              value={apiKey()}
              onInput={(event) => setApiKey(event.currentTarget.value)}
            />
          </Field>
        </FieldGroup>
        <Button
          class="self-start"
          disabled={saving()}
          type="button"
          variant="outline"
          onClick={() => void saveKey()}
        >
          Save API key
        </Button>
      </Show>
      <Show when={saveMessage()}>
        <p class="text-sm text-muted-foreground" role="status">
          {saveMessage()}
        </p>
      </Show>
    </div>
  );
}
