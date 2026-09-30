import { Button, Input } from "@lisca/ui/components";
import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import {
  samplePositionFromDisplay,
  samplePositionToDisplay,
} from "@lisca/client/studio/sample-positions";
import { createSignal, For } from "solid-js";
import IconTrashRegular from "phosphor-icons-solid/IconTrashRegular";

import { studioWizardActions, studioWizardAtom } from "../state/studio-store";

export function MetadataSamples() {
  const wizard = useAtomValue(() => studioWizardAtom);
  const setWizard = useAtomSet(() => studioWizardAtom);
  const updateSample = (
    index: number,
    patch: Parameters<typeof studioWizardActions.updateSample>[2],
  ) => studioWizardActions.updateSample(setWizard, index, patch);
  const addSample = () => studioWizardActions.addSample(setWizard);
  const removeSample = (index: number) => studioWizardActions.removeSample(setWizard, index);

  const samples = () => wizard().samples;

  return (
    <section
      aria-labelledby="studio-samples-title"
      class="flex w-full max-w-[640px] min-w-0 flex-col gap-6"
    >
      <div class="flex flex-col gap-2">
        <h2 class="text-2xl font-semibold leading-8 tracking-[-0.02em]" id="studio-samples-title">
          Samples
        </h2>
        <p class="text-[13px] leading-[18px] text-muted-foreground">
          Each row is one sample: a unique name, position range, and segmentation vs signal
          channels.
        </p>
      </div>
      <div class="flex w-full min-w-0 flex-col gap-5">
        <For each={samples()}>
          {(row, index) => (
            <SampleCard
              index={index()}
              row={row}
              onChange={(patch) => updateSample(index(), patch)}
              onRemove={() => removeSample(index())}
            />
          )}
        </For>
      </div>
      <Button class="w-full justify-center" type="button" variant="outline" onClick={addSample}>
        Add sample
      </Button>
    </section>
  );
}

function SampleCard(props: {
  index: number;
  row: {
    name: string;
    positionStart: string;
    positionFinish: string;
    segmentation: string;
    signal: string;
  };
  onChange: (patch: {
    name?: string;
    positionStart?: string;
    positionFinish?: string;
    segmentation?: string;
    signal?: string;
  }) => void;
  onRemove: () => void;
}) {
  return (
    <article aria-label={`Sample ${props.index + 1}`} class="flex min-w-0 flex-col gap-4">
      <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_2rem] items-end gap-2.5">
        <label class="flex min-w-0 flex-col gap-1.5">
          <span class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Name
          </span>
          <Input
            autocomplete="off"
            aria-label="Name"
            class="h-8 min-w-0 px-3 text-[13px]"
            name={`samples.${props.index}.name`}
            placeholder="e.g. eGFP, 100 nM STS…"
            value={props.row.name}
            onChange={(event) => props.onChange({ name: event.currentTarget.value })}
          />
        </label>
        <Button
          aria-label="Remove sample"
          class="size-8 shrink-0"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={props.onRemove}
        >
          <IconTrashRegular />
        </Button>
      </div>
      <div class="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_minmax(0,1fr)]">
        <SampleField label="Position start">
          <SamplePositionInput
            aria-label="Position start"
            name={`samples.${props.index}.position-start`}
            placeholder="e.g. 1…"
            value={props.row.positionStart}
            onChange={(positionStart) => props.onChange({ positionStart })}
          />
        </SampleField>
        <SampleField label="Position end">
          <SamplePositionInput
            aria-label="Position finish"
            name={`samples.${props.index}.position-finish`}
            placeholder="e.g. 10…"
            value={props.row.positionFinish}
            onChange={(positionFinish) => props.onChange({ positionFinish })}
          />
        </SampleField>
        <SampleField label="Segmentation">
          <Input
            autocomplete="off"
            aria-label="Segmentation channel"
            class="h-8 w-full px-2 text-center font-mono text-[13px]"
            inputMode="numeric"
            name={`samples.${props.index}.segmentation-channel`}
            placeholder="e.g. 0…"
            value={props.row.segmentation}
            onChange={(event) => props.onChange({ segmentation: event.currentTarget.value })}
          />
        </SampleField>
        <SampleField label="Signal">
          <Input
            autocomplete="off"
            aria-label="Signal channels"
            class="h-8 w-full px-3 text-center font-mono text-[13px]"
            name={`samples.${props.index}.signal-channels`}
            placeholder="e.g. 1 or 1,2…"
            value={props.row.signal}
            onChange={(event) => props.onChange({ signal: event.currentTarget.value })}
          />
        </SampleField>
      </div>
    </article>
  );
}

function SampleField(props: { label: string; children: import("solid-js").JSX.Element }) {
  return (
    <label class="flex min-w-0 flex-col gap-1.5">
      <span class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}

/**
 * Edits a stored 0-based position as a 1-based number. Text that is not an integer >= 1
 * stays visible as typed and stores `""`, so validation flags the row.
 */
function SamplePositionInput(props: {
  "aria-label": string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (stored: string) => void;
}) {
  const [draft, setDraft] = createSignal<string | null>(null);

  return (
    <Input
      autocomplete="off"
      aria-label={props["aria-label"]}
      class="h-8 w-full px-3 text-center font-mono text-[13px]"
      inputMode="numeric"
      name={props.name}
      placeholder={props.placeholder}
      value={draft() ?? samplePositionToDisplay(props.value)}
      onChange={(event) => {
        const raw = event.currentTarget.value;
        const stored = samplePositionFromDisplay(raw);
        setDraft(stored == null ? raw : null);
        props.onChange(stored ?? "");
      }}
    />
  );
}
