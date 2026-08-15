import { Field, FieldLabel, Input, Button } from "@lisca/ui/components";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
import { For } from "solid-js";
import IconTrashRegular from "phosphor-icons-solid/IconTrashRegular";

import { studioWizardActions, studioWizardAtom } from "../state/studio-store";

const ROW = "flex min-h-[80px] w-full flex-col gap-2.5 p-2.5";

export function BasicInfoStep2() {
  const wizard = useAtomValue(studioWizardAtom);
  const setWizard = useAtomSet(studioWizardAtom);
  const updateSample = (
    index: number,
    patch: Parameters<typeof studioWizardActions.updateSample>[2],
  ) => studioWizardActions.updateSample(setWizard, index, patch);
  const addSample = () => studioWizardActions.addSample(setWizard);
  const removeSample = (index: number) => studioWizardActions.removeSample(setWizard, index);

  const samples = () => wizard().samples;

  return (
    <div class="flex w-full min-w-0 flex-col gap-2.5">
      <div class={ROW}>
        <Field class="gap-2.5">
          <FieldLabel class="text-xl font-medium">Samples</FieldLabel>
          <p class="text-sm text-muted-foreground">
            Each row is one condition: name, position range, and mask vs signal channels.
          </p>
          <div class="mt-0 flex w-full min-w-0 flex-col gap-2 overflow-y-auto max-h-[60vh]">
            <For each={samples()}>
              {(row, index) => (
                <SampleCard
                  row={row}
                  onChange={(patch) => updateSample(index(), patch)}
                  onRemove={() => removeSample(index())}
                />
              )}
            </For>
          </div>
          <Button
            class="w-full justify-center"
            size="sm"
            type="button"
            variant="outline"
            onClick={addSample}
          >
            Add sample
          </Button>
        </Field>
      </div>
    </div>
  );
}

function SampleCard(props: {
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
    <div class="rounded-lg border border-border p-3">
      <div class="flex flex-col gap-2.5">
        <div class="flex flex-row items-center gap-2.5">
          <Input
            aria-label="Slide channel"
            class="w-16 shrink-0 text-center"
            inputMode="numeric"
            placeholder="slide"
            value={props.row.slideChannel}
            onChange={(e) => props.onChange({ slideChannel: e.currentTarget.value })}
          />
          <Input
            aria-label="Name"
            class="min-w-0 flex-1"
            placeholder="Sample name (e.g. eGFP, 100nM STS)"
            value={props.row.name}
            onChange={(e) => props.onChange({ name: e.currentTarget.value })}
          />
          <Button
            class="shrink-0"
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={props.onRemove}
            aria-label="Remove sample"
          >
            <IconTrashRegular />
          </Button>
        </div>
        <div class="flex flex-row items-center gap-2.5">
          <span class="text-muted-foreground text-sm shrink-0">Positions</span>
          <Input
            aria-label="Position start"
            class="w-20 shrink-0 text-center"
            inputMode="numeric"
            placeholder="start"
            value={props.row.positionStart}
            onChange={(e) => props.onChange({ positionStart: e.currentTarget.value })}
          />
          <span class="text-muted-foreground text-sm">:</span>
          <Input
            aria-label="Position finish"
            class="w-20 shrink-0 text-center"
            inputMode="numeric"
            placeholder="end"
            value={props.row.positionFinish}
            onChange={(e) => props.onChange({ positionFinish: e.currentTarget.value })}
          />
        </div>
        <div class="flex flex-row items-center gap-2.5">
          <span class="text-muted-foreground text-sm shrink-0">Mask</span>
          <Input
            aria-label="Mask channel"
            class="w-20 shrink-0 text-center"
            inputMode="numeric"
            placeholder="mask"
            value={props.row.mask}
            onChange={(e) => props.onChange({ mask: e.currentTarget.value })}
          />
          <span class="text-muted-foreground text-sm shrink-0">Signal</span>
          <Input
            aria-label="Signal channels"
            class="min-w-0 flex-1 text-center"
            placeholder="1 or 1,2"
            value={props.row.signal}
            onChange={(e) => props.onChange({ signal: e.currentTarget.value })}
          />
        </div>
      </div>
    </div>
  );
}
