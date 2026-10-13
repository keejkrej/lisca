import { Button, Input } from "@lisca/ui/primitives";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { runClientEffect } from "@lisca/client/runtime";
import type { LabelFreeClassification, LabelFreeReferenceSet } from "@lisca/contracts";
import { createSignal, For, onMount, Show } from "solid-js";

import { studioClient, toErrorMessage } from "../api/studio-port";

type BuildState = "unknown" | "light" | "ready" | "error";

export function LabelFreeReferences(props: { workspacePath: string | null }) {
  const [build, setBuild] = createSignal<BuildState>("unknown");
  const [cudaBundled, setCudaBundled] = createSignal(false);
  const [reference, setReference] = createSignal<LabelFreeReferenceSet | null>(null);
  const [rows, setRows] = createSignal<LabelFreeClassification[]>([]);
  const [name, setName] = createSignal("annotations");
  const [message, setMessage] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  const probe = async () => {
    try {
      const health = await runClientEffect(studioClient.labelFreeHealth());
      if (health.build === "light") {
        setBuild("light");
        return;
      }
      setBuild("ready");
      setCudaBundled(health.cudaBundled);
      const workspacePath = props.workspacePath?.trim();
      if (!workspacePath) return;
      const sets = await runClientEffect(studioClient.listLabelFreeReferences(workspacePath));
      const existing = sets.find((set) => set.name === name());
      if (existing) setReference(existing);
    } catch (error) {
      setBuild("error");
      setMessage(toErrorMessage(error, "Could not reach the Studio server"));
    }
  };

  onMount(() => {
    void probe();
  });

  const buildReferences = async () => {
    const workspacePath = props.workspacePath?.trim();
    if (!workspacePath) return;
    setBusy(true);
    setMessage(null);
    try {
      const built = await runClientEffect(
        studioClient.buildLabelFreeReferences(workspacePath, name().trim()),
      );
      setReference(built);
      setRows([]);
      const labels = built.labels.map((entry) => `${entry.label} ${entry.count}`).join(", ");
      setMessage(`Saved ${built.count} reference frames (${labels}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not build the reference set.");
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
      const classified = await runClientEffect(
        studioClient.classifyLabelFree(workspacePath, current.name),
      );
      setRows(classified);
      setMessage(
        classified.length === 0
          ? "Every ROI on this plane is already in the reference set."
          : `Classified ${classified.length} ROIs.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not classify ROIs.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelSection appearance="rail" title="Label-free">
      <RailControlStack>
        <Show when={build() === "unknown"}>
          <p class="text-sm text-muted-foreground">Checking this Studio build.</p>
        </Show>
        <Show when={build() === "light"}>
          <p class="text-sm text-muted-foreground">
            This light build runs fluorescence assays. Label-free references are in the heavier
            build, which can also bundle CUDA.
          </p>
        </Show>
        <Show when={build() === "ready"}>
          <p class="text-sm text-muted-foreground">
            Classification labels on Annotate become the reference set.
            {cudaBundled() ? " CUDA is bundled in this build." : ""}
          </p>
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
            <ul class="flex flex-col gap-1 text-sm text-muted-foreground">
              <For each={rows()}>
                {(row) => (
                  <li>
                    Pos{row.pos} Roi{row.roi} {row.labelId} ({Math.round(row.support * 100)}%)
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
