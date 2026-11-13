import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import { Button, ComingSoonTooltip } from "@lisca/ui/primitives";
import { createSignal, For, Show } from "solid-js";

import { studioWizardActions, studioWizardAtom, type AssayId } from "../state/studio-store";

type AssayField = {
  id: "lnp-delivery" | "cell-killing";
  label: string;
  assayIds: readonly AssayId[];
  includesLabelFree: boolean;
};

const ASSAY_FIELDS: readonly AssayField[] = [
  {
    id: "lnp-delivery",
    label: "LNP delivery",
    assayIds: ["transfection", "lnp-binding"],
    includesLabelFree: false,
  },
  {
    id: "cell-killing",
    label: "Cell killing",
    assayIds: ["killing-death-reporter", "killing-engagement"],
    includesLabelFree: true,
  },
];

const ASSAY_CHOICE_DETAIL: Record<
  AssayId,
  { title: string; description: string; readout: string }
> = {
  transfection: {
    title: "LNP transfection",
    description: "Gene expression timeseries",
    readout: "Fluorescence",
  },
  "killing-death-reporter": {
    title: "Killing (death reporter)",
    description: "Cytotoxicity timeseries",
    readout: "Fluorescence",
  },
  "killing-engagement": {
    title: "Killing (engagement)",
    description: "Engager counts",
    readout: "Fluorescence",
  },
  "lnp-binding": {
    title: "LNP binding",
    description: "Nanoparticle binding over time",
    readout: "Fluorescence",
  },
};

export function ChooseAssay(props: { onOpenFeedback?: () => void; onOpenGuide?: () => void }) {
  const wizard = useAtomValue(() => studioWizardAtom);
  const setWizard = useAtomSet(() => studioWizardAtom);
  const setAssayId = (id: AssayId) => studioWizardActions.setAssayId(setWizard, id);
  // Start with the selected assay's field, without remembering browsing choices.
  const [field, setField] = createSignal(
    ASSAY_FIELDS.find((area) => area.assayIds.includes(wizard().assayId ?? "transfection")) ??
      ASSAY_FIELDS[0]!,
  );

  return (
    <div class="flex w-full max-w-[640px] min-w-0 flex-col gap-8">
      <div class="flex w-full flex-col gap-3">
        <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
          Research field
        </span>
        <div aria-label="Research field" class="flex flex-wrap gap-1.5" role="group">
          <For each={ASSAY_FIELDS}>
            {(area) => (
              <Button
                aria-pressed={field() === area}
                size="sm"
                type="button"
                variant={field() === area ? "default" : "outline"}
                onClick={() => setField(area)}
              >
                {area.label}
              </Button>
            )}
          </For>
        </div>
      </div>
      <div class="flex w-full flex-col gap-2.5">
        <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
          Assay workflow
        </span>
        <div aria-label="Assay type" class="flex w-full flex-col gap-2.5" role="group">
          <For each={field().assayIds}>
            {(id) => {
              const selected = () => wizard().assayId === id;
              return (
                <Button
                  aria-pressed={selected()}
                  class="h-auto w-full items-center justify-start gap-3 rounded-none px-5 py-[18px] text-left"
                  type="button"
                  variant={selected() ? "default" : "secondary"}
                  onClick={() => setAssayId(id)}
                >
                  <span class="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <span class="text-base font-medium leading-5">
                      {ASSAY_CHOICE_DETAIL[id].title}
                    </span>
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
          <Show when={field().includesLabelFree}>
            <ComingSoonTooltip class="flex w-full">
              <Button
                aria-disabled="true"
                class="pointer-events-none h-auto w-full items-center justify-start gap-3 rounded-none px-5 py-[18px] text-left"
                disabled
                type="button"
                variant="secondary"
              >
                <span class="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <span class="text-base font-medium leading-5">Killing (label-free)</span>
                  <span class="text-sm font-normal leading-5 text-muted-foreground">
                    Cytotoxicity timeseries
                  </span>
                </span>
                <span class="shrink-0 text-[11px] font-medium uppercase leading-[14px] tracking-[0.14em] text-muted-foreground">
                  Brightfield
                </span>
              </Button>
            </ComingSoonTooltip>
          </Show>
        </div>
      </div>

      <Show when={props.onOpenGuide || props.onOpenFeedback}>
        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <span class="text-xs text-muted-foreground">
            Need another single-cell readout or experimental workflow?
          </span>
          <div class="flex flex-wrap items-center gap-2">
            <Show when={props.onOpenGuide}>
              <Button size="xs" type="button" variant="ghost" onClick={props.onOpenGuide}>
                Research guide
              </Button>
            </Show>
            <Show when={props.onOpenFeedback}>
              <Button size="xs" type="button" variant="ghost" onClick={props.onOpenFeedback}>
                Help us improve LiSCA
              </Button>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
