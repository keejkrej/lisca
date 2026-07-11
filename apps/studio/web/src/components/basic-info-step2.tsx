import {
  Field,
  FieldLabel,
  Input,
  Button,
} from "@lisca/ui/components";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
import { For, Show, createSignal } from "solid-js";
import IconTrashRegular from "phosphor-icons-solid/IconTrashRegular";
import IconCaretDownRegular from "phosphor-icons-solid/IconCaretDownRegular";
import IconCaretRightRegular from "phosphor-icons-solid/IconCaretRightRegular";

import { studioWizardActions, studioWizardAtom } from "../state/studio-store";

const ROW = "flex min-h-[80px] w-full flex-col gap-2.5 p-2.5";

export function BasicInfoStep2() {
  const wizard = useAtomValue(studioWizardAtom);
  const setWizard = useAtomSet(studioWizardAtom);
  const updateSample = (
    index: number,
    patch: Parameters<typeof studioWizardActions.updateInfo3Sample>[2],
  ) => studioWizardActions.updateInfo3Sample(setWizard, index, patch);
  const addSample = () => studioWizardActions.addInfo3Sample(setWizard);
  const removeSample = (index: number) => studioWizardActions.removeInfo3Sample(setWizard, index);

  const samples = () => wizard().info3.samples;

  return (
    <div class="flex w-full min-w-0 flex-col gap-2.5">
      <div class={ROW}>
        <Field class="gap-2.5">
          <FieldLabel class="text-2xl font-normal">Samples</FieldLabel>
          <div class="mt-0 flex w-full min-w-0 flex-col gap-2">
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
    channel: string;
    name: string;
    positionStart: string;
    positionFinish: string;
    maskChannel: string;
    signalChannel: string;
  };
  onChange: (patch: {
    channel?: string;
    name?: string;
    positionStart?: string;
    positionFinish?: string;
    maskChannel?: string;
    signalChannel?: string;
  }) => void;
  onRemove: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = createSignal(false);

  return (
    <div class="rounded-lg border border-border p-3">
      <div class="flex flex-col gap-2.5">
        <div class="flex flex-row items-center gap-2.5">
          <Input
            aria-label="Channel"
            class="w-16 shrink-0 text-center"
            inputMode="numeric"
            placeholder="ch"
            value={props.row.channel}
            onChange={(e) => props.onChange({ channel: e.currentTarget.value })}
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
        <button
          class="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <Show when={advancedOpen()} fallback={<IconCaretRightRegular />}>
            <IconCaretDownRegular />
          </Show>
          Advanced
        </button>
        <Show when={advancedOpen()}>
          <div class="flex flex-row items-center gap-2.5 pl-1">
            <label class="flex flex-1 flex-col gap-1">
              <span class="text-muted-foreground text-xs">Mask channel</span>
              <Input
                aria-label="Mask channel"
                class="text-center"
                inputMode="numeric"
                placeholder="0"
                value={props.row.maskChannel}
                onChange={(e) => props.onChange({ maskChannel: e.currentTarget.value })}
              />
            </label>
            <label class="flex flex-1 flex-col gap-1">
              <span class="text-muted-foreground text-xs">Signal channel</span>
              <Input
                aria-label="Signal channel"
                class="text-center"
                inputMode="numeric"
                placeholder="1"
                value={props.row.signalChannel}
                onChange={(e) => props.onChange({ signalChannel: e.currentTarget.value })}
              />
            </label>
          </div>
        </Show>
      </div>
    </div>
  );
}
