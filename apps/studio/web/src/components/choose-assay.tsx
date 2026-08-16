import { ENABLED_STUDIO_ASSAY_IDS } from "@lisca/contracts/assay";
import { Button } from "@lisca/ui/components";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
import { For } from "solid-js";

import {
  ASSAY_CHOICE_LABEL,
  type AssayId,
  studioWizardActions,
  studioWizardAtom,
} from "../state/studio-store";

const ASSAY_ORDER = ENABLED_STUDIO_ASSAY_IDS as readonly AssayId[];

const ASSAY_CHOICE_DETAIL: Record<AssayId, { description: string; readout: string }> = {
  transfection: {
    description: "Expression over time",
    readout: "Fluorescence",
  },
  killing: {
    description: "Cytotoxicity over time",
    readout: "Brightfield",
  },
  "lnp-binding": {
    description: "Nanoparticle binding over time",
    readout: "Fluorescence",
  },
};

export function ChooseAssay() {
  const wizard = useAtomValue(studioWizardAtom);
  const setWizard = useAtomSet(studioWizardAtom);
  const setAssayId = (id: AssayId) => studioWizardActions.setAssayId(setWizard, id);

  return (
    <div class="flex w-full max-w-[640px] min-w-0 flex-col gap-8">
      <div class="flex flex-col items-start gap-3">
        <h1 class="text-4xl font-semibold leading-10 tracking-[-0.025em]">LiSCA</h1>
        <p class="text-sm leading-5 text-muted-foreground">
          Set up a new assay, or open one you already saved.
        </p>
      </div>
      <div aria-label="Assay type" class="flex w-full flex-col gap-2.5" role="group">
        <For each={ASSAY_ORDER}>
          {(id) => {
            const selected = () => wizard().assayId === id;
            return (
              <Button
                aria-pressed={selected()}
                class="h-auto w-full items-center justify-start gap-3 rounded-[18px] px-5 py-[18px] text-left"
                type="button"
                variant={selected() ? "default" : "secondary"}
                onClick={() => setAssayId(id)}
              >
                <span class="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <span class="text-base font-medium leading-5">{ASSAY_CHOICE_LABEL[id]}</span>
                  <span
                    class={
                      selected()
                        ? "text-sm font-normal leading-5 text-primary-foreground/75"
                        : "text-sm font-normal leading-5 text-muted-foreground"
                    }
                  >
                    {ASSAY_CHOICE_DETAIL[id].description}
                  </span>
                </span>
                <span
                  class={
                    selected()
                      ? "shrink-0 text-[11px] font-medium uppercase leading-[14px] tracking-[0.14em] text-primary-foreground"
                      : "shrink-0 text-[11px] font-medium uppercase leading-[14px] tracking-[0.14em] text-muted-foreground"
                  }
                >
                  {ASSAY_CHOICE_DETAIL[id].readout}
                </span>
              </Button>
            );
          }}
        </For>
      </div>
    </div>
  );
}
