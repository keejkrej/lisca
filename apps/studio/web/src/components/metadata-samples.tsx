import {
  Button,
  Card,
  CardContent,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lisca/ui/components";
import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import {
  commitDisplayPositionDraft,
  formatPositionChip,
  formatStoredPositions,
  storedPositionRanges,
  type StoredPositionRange,
} from "@lisca/client/studio/sample-positions";
import { createEffect, createSignal, createUniqueId, For, Show, type JSX } from "solid-js";
import IconInfoRegular from "phosphor-icons-solid/IconInfoRegular";
import IconTrashRegular from "phosphor-icons-solid/IconTrashRegular";
import IconXRegular from "phosphor-icons-solid/IconXRegular";

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
          Each card is one sample: a unique name and the positions it covers. Set the segmentation
          and signal channels once for the assay. A card can override them.
        </p>
      </div>
      <div class="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <SampleField
          hint="Channel used to find cells. Used for every sample unless a card overrides it."
          label="Segmentation channel"
        >
          {(fieldId) => (
            <Input
              id={fieldId}
              autocomplete="off"
              aria-label="Segmentation channel"
              class="h-8 w-full px-3 font-mono text-[13px]"
              inputMode="numeric"
              name="assay-segmentation-channel"
              value={wizard().segmentationChannel}
              onInput={(event) =>
                studioWizardActions.patchWizard(setWizard, {
                  segmentationChannel: event.currentTarget.value,
                })
              }
            />
          )}
        </SampleField>
        <SampleField
          hint="Channel measured for intensity. Separate extra channels with a comma. Used for every sample unless a card overrides it."
          label="Signal channel"
        >
          {(fieldId) => (
            <Input
              id={fieldId}
              autocomplete="off"
              aria-label="Signal channel"
              class="h-8 w-full px-3 font-mono text-[13px]"
              name="assay-signal-channel"
              value={wizard().signalChannel}
              onInput={(event) =>
                studioWizardActions.patchWizard(setWizard, {
                  signalChannel: event.currentTarget.value,
                })
              }
            />
          )}
        </SampleField>
      </div>
      <div class="grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-4">
        <For each={samples().map((row) => row.id)}>
          {(id, index) => {
            const row = () => samples().find((sample) => sample.id === id);
            return (
              <Show when={row()}>
                {(current) => (
                  <SampleCard
                    index={index()}
                    row={current()}
                    onChange={(patch) => updateSample(index(), patch)}
                    onRemove={() => removeSample(index())}
                  />
                )}
              </Show>
            );
          }}
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
    positions: string;
    segmentation: string;
    signal: string;
  };
  onChange: (patch: {
    name?: string;
    positions?: string;
    segmentation?: string;
    signal?: string;
  }) => void;
  onRemove: () => void;
}) {
  return (
    <Card aria-label={`Sample ${props.index + 1}`} class="min-w-0" role="article" size="sm">
      <CardContent class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Name
            </span>
            <Button
              aria-label="Remove sample"
              class="size-6"
              size="icon-xs"
              type="button"
              variant="ghost"
              onClick={props.onRemove}
            >
              <IconTrashRegular />
            </Button>
          </div>
          <Input
            autocomplete="off"
            aria-label="Name"
            class="h-8 w-full min-w-0 px-3 text-[13px]"
            name={`samples.${props.index}.name`}
            value={props.row.name}
            onChange={(event) => props.onChange({ name: event.currentTarget.value })}
          />
        </div>
        <SampleField
          hint="Counting starts at 1. Type 1-5, 21-25, 28 and press Enter."
          label="Positions"
        >
          {(fieldId) => (
            <SamplePositionsInput
              id={fieldId}
              name={`samples.${props.index}.positions`}
              value={props.row.positions}
              onChange={(positions) => props.onChange({ positions })}
            />
          )}
        </SampleField>
        <SampleField
          hint="Override for this sample only. Leave empty to use the assay segmentation channel."
          label="Segmentation channel"
        >
          {(fieldId) => (
            <Input
              id={fieldId}
              autocomplete="off"
              aria-label="Segmentation channel"
              class="h-8 w-full px-3 font-mono text-[13px]"
              inputMode="numeric"
              name={`samples.${props.index}.segmentation-channel`}
              value={props.row.segmentation}
              onInput={(event) => props.onChange({ segmentation: event.currentTarget.value })}
            />
          )}
        </SampleField>
        <SampleField
          hint="Override for this sample only. Leave empty to use the assay signal channel. Separate extra channels with a comma."
          label="Signal channel"
        >
          {(fieldId) => (
            <Input
              id={fieldId}
              autocomplete="off"
              aria-label="Signal channel"
              class="h-8 w-full px-3 font-mono text-[13px]"
              name={`samples.${props.index}.signal-channels`}
              value={props.row.signal}
              onInput={(event) => props.onChange({ signal: event.currentTarget.value })}
            />
          )}
        </SampleField>
      </CardContent>
    </Card>
  );
}

function SampleField(props: {
  label: string;
  hint?: string;
  children: (fieldId: string) => JSX.Element;
}) {
  const fieldId = createUniqueId();
  return (
    <div class="flex min-w-0 flex-col gap-1.5">
      <div class="flex min-w-0 items-center gap-1">
        <label
          class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
          for={fieldId}
        >
          {props.label}
        </label>
        <Show when={props.hint}>
          {(hint) => (
            <Tooltip placement="top" openDelay={200}>
              <TooltipTrigger
                type="button"
                aria-label={`${props.label} details`}
                class="inline-flex size-3.5 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-muted-foreground"
                delay={200}
              >
                <IconInfoRegular class="size-3.5" />
              </TooltipTrigger>
              <TooltipContent class="max-w-56 px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-4 tracking-normal">
                {hint()}
              </TooltipContent>
            </Tooltip>
          )}
        </Show>
      </div>
      {props.children(fieldId)}
    </div>
  );
}

/**
 * Edits 0-based assay positions as 1-based chips. `1-5, 21-25` becomes two chips.
 * A token that is not a position stays in the field and is not saved.
 */
function SamplePositionsInput(props: {
  id: string;
  name: string;
  value: string;
  onChange: (positions: string) => void;
}) {
  const [draft, setDraft] = createSignal("");
  const [invalid, setInvalid] = createSignal(false);
  // The field can commit twice before the wizard prop catches up (comma, then blur).
  let committed = props.value;
  let seen = props.value;
  const [ranges, setRanges] = createSignal(storedPositionRanges(props.value));
  createEffect(() => {
    const incoming = props.value;
    if (incoming === seen) return;
    seen = incoming;
    committed = incoming;
    setRanges(storedPositionRanges(incoming));
  });

  const publish = (positions: string) => {
    committed = positions;
    setRanges(storedPositionRanges(positions));
    if (positions !== props.value) props.onChange(positions);
  };

  const applyDraft = (raw: string, commitTrailing: boolean) => {
    const next = commitDisplayPositionDraft(committed, raw, commitTrailing);
    publish(next.positions);
    setDraft(next.draft);
    setInvalid(next.invalid);
  };

  const removeRange = (range: StoredPositionRange) => {
    publish(
      formatStoredPositions(
        ranges().filter((item) => item.start !== range.start || item.end !== range.end),
      ),
    );
  };

  return (
    <div
      class="flex min-h-8 w-full flex-wrap items-center gap-1 rounded-none border border-input bg-transparent px-1.5 py-1 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20"
      aria-invalid={invalid() ? true : undefined}
    >
      <For each={ranges()}>
        {(range) => {
          const label = () => formatPositionChip(range);
          return (
            <span class="inline-flex h-6 max-w-full items-center gap-0.5 bg-muted px-1.5 font-mono text-[12px] text-foreground">
              <span class="truncate">{label()}</span>
              <Button
                aria-label={`Remove ${label()}`}
                class="size-4"
                size="icon-xs"
                type="button"
                variant="ghost"
                onClick={() => removeRange(range)}
              >
                <IconXRegular class="size-3" />
              </Button>
            </span>
          );
        }}
      </For>
      <input
        id={props.id}
        autocomplete="off"
        aria-invalid={invalid() ? "true" : undefined}
        aria-label="Positions"
        class="h-6 min-w-16 flex-1 border-0 bg-transparent px-1 font-mono text-[13px] outline-none"
        name={props.name}
        value={draft()}
        onBlur={(event) => {
          applyDraft(event.currentTarget.value, true);
          event.currentTarget.value = draft();
        }}
        onInput={(event) => {
          applyDraft(event.currentTarget.value, event.inputType === "insertFromPaste");
          event.currentTarget.value = draft();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applyDraft(draft(), true);
          }
          if (event.key === "Backspace" && draft() === "" && ranges().length > 0) {
            event.preventDefault();
            const current = ranges();
            removeRange(current[current.length - 1]!);
          }
        }}
      />
    </div>
  );
}
