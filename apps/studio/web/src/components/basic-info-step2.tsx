import {
  Field,
  FieldLabel,
  Input,
  Button,
} from "@lisca/ui/components";
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
          <FieldLabel class="text-2xl font-normal">Samples</FieldLabel>
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
    slide: string;
    name: string;
    positionStart: string;
    positionFinish: string;
    brightfield: string;
    fluorescence: string;
  };
  onChange: (patch: {
    slide?: string;
    name?: string;
    positionStart?: string;
    positionFinish?: string;
    brightfield?: string;
    fluorescence?: string;
  }) => void;
  onRemove: () => void;
}) {
  return (
    <div class="rounded-lg border border-border p-3">
      <div class="flex flex-col gap-2.5">
        <div class="flex flex-row items-center gap-2.5">
          <Input
            aria-label="Slide"
            class="w-16 shrink-0 text-center"
            inputMode="numeric"
            placeholder="slide"
            value={props.row.slide}
            onChange={(e) => props.onChange({ slide: e.currentTarget.value })}
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
          <span class="text-muted-foreground text-sm shrink-0">Brightfield</span>
          <Input
            aria-label="Brightfield channel"
            class="w-20 shrink-0 text-center"
            inputMode="numeric"
            placeholder="0"
            value={props.row.brightfield}
            onChange={(e) => props.onChange({ brightfield: e.currentTarget.value })}
          />
          <span class="text-muted-foreground text-sm shrink-0">Fluorescence</span>
          <Input
            aria-label="Fluorescence channel"
            class="w-20 shrink-0 text-center"
            inputMode="numeric"
            placeholder="1"
            value={props.row.fluorescence}
            onChange={(e) => props.onChange({ fluorescence: e.currentTarget.value })}
          />
        </div>
      </div>
    </div>
  );
}
