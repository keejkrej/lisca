import { createSignal, For, onCleanup, Show } from "solid-js";
import { Button, Field, FieldGroup, FieldLabel, Input, NativeSelect } from "@lisca/ui/components";
import {
  createInferenceClient,
  inferenceUrl,
  viabilityCsv,
  type InferenceHealth,
  type ReferenceSet,
  type ViabilityResult,
} from "@lisca/client/inference";
import { saveLiscaFile } from "@lisca/client/desktop";

function rememberedUrl() {
  try {
    return localStorage.getItem("lisca.inference.url") ?? "";
  } catch {
    return "";
  }
}

export function RemoteViability() {
  const [url, setUrl] = createSignal(rememberedUrl());
  const [token, setToken] = createSignal("");
  const [health, setHealth] = createSignal<InferenceHealth>();
  const [sets, setSets] = createSignal<ReferenceSet[]>([]);
  const [referenceSet, setReferenceSet] = createSignal("");
  const [files, setFiles] = createSignal<File[]>([]);
  const [roiIndex, setRoiIndex] = createSignal<File>();
  const [group, setGroup] = createSignal("");
  const [channel, setChannel] = createSignal(0);
  const [z, setZ] = createSignal(0);
  const [stride, setStride] = createSignal(1);
  const [history, setHistory] = createSignal(1);
  const [results, setResults] = createSignal<ViabilityResult[]>([]);
  const [busy, setBusy] = createSignal(false);
  const [message, setMessage] = createSignal("");
  const [error, setError] = createSignal("");
  const [name, setName] = createSignal("");
  const [viable, setViable] = createSignal<File[]>([]);
  const [dead, setDead] = createSignal<File[]>([]);
  let controller: AbortController | undefined;
  onCleanup(() => controller?.abort());
  const client = () => createInferenceClient({ url: url(), token: token() });
  const invalidate = () => {
    setHealth(undefined);
    setSets([]);
    setReferenceSet("");
  };

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (busy()) return;
    controller = new AbortController();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action(controller.signal);
    } catch (cause) {
      setError(
        controller.signal.aborted
          ? "Request cancelled."
          : cause instanceof Error
            ? cause.message
            : "Inference request failed.",
      );
    } finally {
      setBusy(false);
      controller = undefined;
    }
  }

  async function connect() {
    invalidate();
    await run(async (signal) => {
      const api = client();
      const connected = await api.health(signal);
      const available = await api.references(signal);
      setHealth(connected);
      setSets(available);
      setReferenceSet(available[0]?.name ?? "");
      try {
        localStorage.setItem("lisca.inference.url", inferenceUrl(url()));
      } catch {
        /* Connection still works without persistence. */
      }
      setMessage(
        `Connected to ${connected.device}. ${available.length} reference set(s) available.`,
      );
    });
  }

  async function addReferences() {
    await run(async (signal) => {
      const api = client();
      const examples = [
        ...viable().map((file) => ({
          file,
          label: "viable" as const,
          group: file.name.replace(/\.[^.]+$/, ""),
        })),
        ...dead().map((file) => ({
          file,
          label: "dead" as const,
          group: file.name.replace(/\.[^.]+$/, ""),
        })),
      ];
      const added = await api.addReferences(name(), "frame", examples, signal);
      setSets(await api.references(signal));
      setReferenceSet(added.name);
      setMessage(`Saved ${added.count} references. The image encoder remains frozen.`);
    });
  }

  async function analyze() {
    await run(async (signal) => {
      const api = client();
      const selected = files();
      setResults([]);
      for (let i = 0; i < selected.length; i += 1) {
        const file = selected[i]!;
        setMessage(`Analyzing ${file.name} (${i + 1}/${selected.length})…`);
        // Bound movie upload memory; the server batches frames across callers.
        // eslint-disable-next-line no-await-in-loop
        const result = await api.viability(
          file,
          {
            referenceSet: referenceSet(),
            group:
              selected.length === 1 ? group() : `${group()}/${file.name.replace(/\.[^.]+$/, "")}`,
            channel: channel(),
            z: z(),
            stride: stride(),
            history: history(),
            roiIndex: roiIndex(),
          },
          signal,
        );
        setResults((current) => [...current, result]);
      }
      setMessage(`Finished ${selected.length} ROI movie(s).`);
    });
  }

  async function download(result: ViabilityResult, format: "csv" | "json") {
    await run(async () => {
      const text = format === "csv" ? viabilityCsv(result) : JSON.stringify(result, null, 2);
      await saveLiscaFile({
        fileName: `${result.group.replace(/[^a-zA-Z0-9_-]/g, "-")}-viability.${format}`,
        filterName: format.toUpperCase(),
        extensions: [format],
        mimeType: format === "csv" ? "text/csv" : "application/json",
        bytes: new TextEncoder().encode(text),
      });
    });
  }

  return (
    <section
      aria-label="Remote label-free viability"
      class="mb-8 rounded-lg border border-border p-5"
    >
      <h2 class="text-lg font-semibold">Label-free viability</h2>
      <p class="mb-4 text-sm text-muted-foreground">
        Analyze ROI movies with a frozen image model on your inference server. Review cell isolation
        and crop stability before interpreting the trace.
      </p>
      <fieldset disabled={busy()} class="flex flex-col gap-4">
        <FieldGroup class="gap-3">
          <Field>
            <FieldLabel for="inference-url">Inference server</FieldLabel>
            <Input
              id="inference-url"
              type="url"
              placeholder="https://your-spark.your-tailnet.ts.net"
              value={url()}
              onInput={(e) => {
                setUrl(e.currentTarget.value);
                invalidate();
              }}
            />
          </Field>
          <Field>
            <FieldLabel for="inference-token">Server token</FieldLabel>
            <Input
              id="inference-token"
              type="password"
              autocomplete="off"
              value={token()}
              onInput={(e) => {
                setToken(e.currentTarget.value);
                invalidate();
              }}
            />
            <p class="text-xs text-muted-foreground">
              Kept in memory for this page. Use your private Tailscale address.
            </p>
          </Field>
        </FieldGroup>
        <Button type="button" variant="outline" class="self-start" onClick={() => void connect()}>
          Test connection
        </Button>
        <Show when={health()}>
          <details>
            <summary class="cursor-pointer text-sm font-medium">
              Add labeled reference images
            </summary>
            <p class="my-2 text-sm text-muted-foreground">
              Choose isolated-cell PNG/JPEG examples for both classes, scaled per frame to the
              1st–99th intensity percentiles. Use other ROIs for evaluation. Names are immutable;
              create a new set when revising examples.
            </p>
            <FieldGroup class="gap-3">
              <Field>
                <FieldLabel for="reference-name">New reference set name</FieldLabel>
                <Input
                  id="reference-name"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  pattern="[a-zA-Z0-9_-]{1,64}"
                />
              </Field>
              <Field>
                <FieldLabel for="viable-examples">Viable examples</FieldLabel>
                <Input
                  id="viable-examples"
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  onChange={(e) => setViable(Array.from(e.currentTarget.files ?? []))}
                />
              </Field>
              <Field>
                <FieldLabel for="dead-examples">Dead examples</FieldLabel>
                <Input
                  id="dead-examples"
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  onChange={(e) => setDead(Array.from(e.currentTarget.files ?? []))}
                />
              </Field>
            </FieldGroup>
            <Button
              class="mt-3"
              type="button"
              variant="outline"
              disabled={!name() || !viable().length || !dead().length}
              onClick={() => void addReferences()}
            >
              Embed and save references
            </Button>
          </details>
          <FieldGroup class="gap-3">
            <Field>
              <FieldLabel for="inference-references">Reference set</FieldLabel>
              <NativeSelect
                id="inference-references"
                value={referenceSet()}
                onChange={(e) => setReferenceSet(e.currentTarget.value)}
              >
                <option value="">Choose references</option>
                <For each={sets()}>
                  {(set) => (
                    <option value={set.name}>
                      {set.name} ({set.count} images)
                    </option>
                  )}
                </For>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel for="inference-movies">ROI TIFF movies (same Position)</FieldLabel>
              <Input
                id="inference-movies"
                type="file"
                multiple
                accept=".tif,.tiff"
                onChange={(e) => {
                  setFiles(Array.from(e.currentTarget.files ?? []));
                  setResults([]);
                }}
              />
              <p class="text-xs text-muted-foreground">
                TYX or TCZYX; up to 63 MiB and 4,096 frames per movie.
              </p>
            </Field>
            <Field>
              <FieldLabel for="inference-index">ROI index.json</FieldLabel>
              <Input
                id="inference-index"
                type="file"
                accept=".json"
                onChange={(e) => setRoiIndex(e.currentTarget.files?.[0])}
              />
              <p class="text-xs text-muted-foreground">
                Select index.json from the movies’ Position folder. Required for LiSCA crops;
                preserves channels and acquisition Frame IDs.
              </p>
            </Field>
            <Field>
              <FieldLabel for="inference-group">
                ROI identity (or Position prefix for multiple movies)
              </FieldLabel>
              <Input
                id="inference-group"
                placeholder="Pos0/Roi4"
                value={group()}
                onInput={(e) => setGroup(e.currentTarget.value)}
              />
            </Field>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field>
                <FieldLabel for="inference-channel">Channel (0-based)</FieldLabel>
                <Input
                  id="inference-channel"
                  type="number"
                  min="0"
                  value={channel()}
                  onInput={(e) => setChannel(e.currentTarget.valueAsNumber)}
                />
              </Field>
              <Field>
                <FieldLabel for="inference-z">Z plane (0-based)</FieldLabel>
                <Input
                  id="inference-z"
                  type="number"
                  min="0"
                  value={z()}
                  onInput={(e) => setZ(e.currentTarget.valueAsNumber)}
                />
              </Field>
              <Field>
                <FieldLabel for="inference-stride">Frame stride</FieldLabel>
                <Input
                  id="inference-stride"
                  type="number"
                  min="1"
                  max="100"
                  value={stride()}
                  onInput={(e) => setStride(e.currentTarget.valueAsNumber)}
                />
              </Field>
              <Field>
                <FieldLabel for="inference-history">Average observations</FieldLabel>
                <Input
                  id="inference-history"
                  type="number"
                  min="1"
                  max="10"
                  value={history()}
                  onInput={(e) => setHistory(e.currentTarget.valueAsNumber)}
                />
              </Field>
            </div>
          </FieldGroup>
          <Button
            type="button"
            class="self-start"
            disabled={!files().length || !referenceSet() || !group().trim()}
            onClick={() => void analyze()}
          >
            Analyze on server
          </Button>
        </Show>
      </fieldset>
      <Show when={busy()}>
        <Button class="mt-3" type="button" variant="outline" onClick={() => controller?.abort()}>
          Cancel
        </Button>
      </Show>
      <p role="status" class="mt-3 text-sm">
        {message()}
      </p>
      <Show when={error()}>
        <p role="alert" class="mt-2 text-sm text-destructive">
          {error()}
        </p>
      </Show>
      <For each={results()}>
        {(result) => (
          <div class="mt-5 border-t border-border pt-4">
            <h3 class="font-medium">{result.group}</h3>
            <p class="text-sm text-muted-foreground">
              {result.step.state === "transition"
                ? `Retrospective step: frame ${result.step.first_dead_frame}`
                : result.step.state === "always_viable"
                  ? "No death transition in this movie"
                  : "Classified dead from the first frame"}
              {result.step.tied_indices.length > 1 ? " (multiple equally good fits)" : ""}
            </p>
            <ViabilityPlot result={result} />
            <p class="text-xs text-muted-foreground">
              Blue: viable vote support. Orange: fitted step. Support is not a probability; the step
              uses the whole movie. Frame IDs:{" "}
              {result.frame_source === "roi-index" ? "ROI index" : "stored TIFF"}.
            </p>
            <div class="mt-3 flex gap-2">
              <Button
                disabled={busy()}
                variant="outline"
                onClick={() => void download(result, "csv")}
              >
                Save CSV
              </Button>
              <Button
                disabled={busy()}
                variant="outline"
                onClick={() => void download(result, "json")}
              >
                Save JSON
              </Button>
            </div>
          </div>
        )}
      </For>
    </section>
  );
}

function ViabilityPlot(props: { result: ViabilityResult }) {
  const x = (frame: number) => 40 + (700 * frame) / Math.max(1, props.result.frames.at(-1) ?? 1);
  const points = () =>
    props.result.frames
      .map((frame, i) => `${x(frame)},${170 - 140 * props.result.viable_support[i]!}`)
      .join(" ");
  const step = () =>
    props.result.frames
      .map(
        (frame, i) =>
          `${i ? `H${x(frame)}` : `M${x(frame)}`} ${i ? "V" : ","}${170 - 140 * props.result.step.viability[i]!}`,
      )
      .join(" ");
  return (
    <svg
      viewBox="0 0 780 210"
      role="img"
      aria-label={`Viability trace for ${props.result.group}`}
      class="my-3 w-full"
    >
      <path d="M40 20V170H745" fill="none" stroke="currentColor" opacity="0.3" />
      <text x="10" y="35" fill="currentColor" font-size="12">
        1
      </text>
      <text x="10" y="175" fill="currentColor" font-size="12">
        0
      </text>
      <text x="40" y="195" fill="currentColor" font-size="12">
        0
      </text>
      <text x="695" y="195" fill="currentColor" font-size="12">
        {props.result.frames.at(-1)}
      </text>
      <polyline points={points()} fill="none" stroke="#3585b5" stroke-width="2" />
      <path d={step()} fill="none" stroke="#bd4c2f" stroke-width="2" />
    </svg>
  );
}
