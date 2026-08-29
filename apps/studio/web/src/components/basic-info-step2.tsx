import { Button, Input } from "@lisca/ui/components";
import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import { For } from "solid-js";
import IconTrashRegular from "phosphor-icons-solid/IconTrashRegular";

import { studioWizardActions, studioWizardAtom } from "../state/studio-store";

export function BasicInfoStep2() {
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
        <h1 class="text-2xl font-semibold leading-8 tracking-[-0.02em]" id="studio-samples-title">
          Samples
        </h1>
        <p class="text-[13px] leading-[18px] text-muted-foreground">
          Each row is one condition: name, position range, and mask vs signal channels.
        </p>
      </div>
      <div class="w-full min-w-0 border-y border-border">
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
      <Button
        class="w-full justify-center rounded-full"
        type="button"
        variant="outline"
        onClick={addSample}
      >
        Add sample
      </Button>
    </section>
  );
}

function SampleCard(props: {
  index: number;
  row: {
    slideChannel: string;
    name: string;
    positionStart: string;
    positionFinish: string;
    mask: string;
    signal: string;
  };
  onChange: (patch: {
    slideChannel?: string;
    name?: string;
    positionStart?: string;
    positionFinish?: string;
    mask?: string;
    signal?: string;
  }) => void;
  onRemove: () => void;
}) {
  return (
    <article
      aria-label={`Sample ${props.index + 1}`}
      class="flex min-w-0 flex-col gap-4 border-b border-border py-5 last:border-b-0"
    >
      <div class="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-end gap-2.5">
        <label class="flex min-w-0 flex-col gap-1.5">
          <span class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Slide
          </span>
          <Input
            autocomplete="off"
            aria-label="Slide channel"
            class="h-8 w-full rounded-full px-2 text-center font-mono text-[13px]"
            inputMode="numeric"
            name={`samples.${props.index}.slide-channel`}
            placeholder="e.g. 0…"
            value={props.row.slideChannel}
            onChange={(event) => props.onChange({ slideChannel: event.currentTarget.value })}
          />
        </label>
        <label class="flex min-w-0 flex-col gap-1.5">
          <span class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Name
          </span>
          <Input
            autocomplete="off"
            aria-label="Name"
            class="h-8 min-w-0 rounded-full px-3 text-[13px]"
            name={`samples.${props.index}.name`}
            placeholder="e.g. eGFP, 100 nM STS…"
            value={props.row.name}
            onChange={(event) => props.onChange({ name: event.currentTarget.value })}
          />
        </label>
        <Button
          aria-label="Remove sample"
          class="size-8 shrink-0 rounded-full"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={props.onRemove}
        >
          <IconTrashRegular />
        </Button>
      </div>
      <div class="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_minmax(0,1fr)]">
        <SampleField label="Position start">
          <Input
            autocomplete="off"
            aria-label="Position start"
            class="h-8 w-full rounded-full px-3 text-center font-mono text-[13px]"
            inputMode="numeric"
            name={`samples.${props.index}.position-start`}
            placeholder="e.g. 0…"
            value={props.row.positionStart}
            onChange={(event) => props.onChange({ positionStart: event.currentTarget.value })}
          />
        </SampleField>
        <SampleField label="Position end">
          <Input
            autocomplete="off"
            aria-label="Position finish"
            class="h-8 w-full rounded-full px-3 text-center font-mono text-[13px]"
            inputMode="numeric"
            name={`samples.${props.index}.position-finish`}
            placeholder="e.g. 10…"
            value={props.row.positionFinish}
            onChange={(event) => props.onChange({ positionFinish: event.currentTarget.value })}
          />
        </SampleField>
        <SampleField label="Mask">
          <Input
            autocomplete="off"
            aria-label="Mask channel"
            class="h-8 w-full rounded-full px-2 text-center font-mono text-[13px]"
            inputMode="numeric"
            name={`samples.${props.index}.mask-channel`}
            placeholder="e.g. 0…"
            value={props.row.mask}
            onChange={(event) => props.onChange({ mask: event.currentTarget.value })}
          />
        </SampleField>
        <SampleField label="Signal">
          <Input
            autocomplete="off"
            aria-label="Signal channels"
            class="h-8 w-full rounded-full px-3 text-center font-mono text-[13px]"
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
