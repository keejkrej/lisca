import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import { ENABLED_STUDIO_ASSAY_IDS } from "@lisca/contracts/assay";
import { Button, ComingSoonTooltip } from "@lisca/ui/primitives";
import { createMemo, For, Show } from "solid-js";

import {
  assaysForAreaFilter,
  getResearchAreaSpec,
  RESEARCH_AREAS,
  specificResearchAreasFromInterests,
  studioOnboardingActions,
  studioOnboardingAtom,
  type AssayAreaFilter,
} from "../state/studio-onboarding";
import {
  isBasicInfoDirty,
  studioWizardActions,
  studioWizardAtom,
  type AssayId,
} from "../state/studio-store";

const ALL_ASSAY_ORDER = ENABLED_STUDIO_ASSAY_IDS as readonly AssayId[];

const ASSAY_CHOICE_DETAIL: Record<
  AssayId,
  { title: string; description: string; readout: string }
> = {
  transfection: {
    title: "Transfection",
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

export function ChooseAssay(props: {
  onChangeInterests?: () => void;
  onOpenGuide?: () => void;
  onOpenFeedback?: () => void;
}) {
  const wizard = useAtomValue(() => studioWizardAtom);
  const setWizard = useAtomSet(() => studioWizardAtom);
  const onboarding = useAtomValue(() => studioOnboardingAtom);
  const setOnboarding = useAtomSet(() => studioOnboardingAtom);

  const setAssayId = (id: AssayId) => studioWizardActions.setAssayId(setWizard, id);

  const specificInterests = createMemo(() =>
    specificResearchAreasFromInterests(onboarding().interests),
  );

  const areaOptions = createMemo(() => {
    const base: { id: AssayAreaFilter; label: string }[] = [];
    if (specificInterests().length >= 2) {
      base.push({ id: "selected", label: "My research areas" });
    }
    for (const area of RESEARCH_AREAS) {
      base.push({ id: area.id, label: area.shortTitle });
    }
    base.push({ id: "all", label: "All assays" });
    return base;
  });

  const activeFilter = createMemo((): AssayAreaFilter => {
    const current = onboarding().activeArea;
    if (current === "selected" && specificInterests().length < 2) {
      return specificInterests()[0] ?? "all";
    }
    return current;
  });

  const filtered = createMemo(() => assaysForAreaFilter(activeFilter(), onboarding().interests));

  const visibleAssayIds = createMemo(() => {
    const allowed = filtered().assayIds;
    if (activeFilter() === "all") return ALL_ASSAY_ORDER;
    return allowed;
  });

  const activeAreaSummary = createMemo(() => {
    const filter = activeFilter();
    if (filter === "all") return null;
    if (filter === "selected") {
      const titles = specificInterests().map((id) => getResearchAreaSpec(id).title);
      return `Showing assays for ${titles.join(" and ")}.`;
    }
    const spec = getResearchAreaSpec(filter);
    return `${spec.title} — ${spec.researchQuestion}`;
  });

  const selectAreaFilter = (nextFilter: AssayAreaFilter) => {
    studioOnboardingActions.setActiveArea(setOnboarding, nextFilter);
    const { assayIds } = assaysForAreaFilter(nextFilter, onboarding().interests);
    const currentWizard = wizard();
    const currentAssay = currentWizard.assayId;
    const blankUntouched =
      currentWizard.basicInfoSavedSnapshot === null && !isBasicInfoDirty(currentWizard);
    if (
      blankUntouched &&
      assayIds.length > 0 &&
      (!currentAssay || !assayIds.includes(currentAssay))
    ) {
      setAssayId(assayIds[0]!);
    }
  };

  return (
    <div class="flex w-full max-w-[640px] min-w-0 flex-col gap-8">
      <div class="flex flex-col items-start gap-3">
        <div class="flex w-full flex-wrap items-baseline justify-between gap-2">
          <h1 class="text-4xl font-semibold leading-10 tracking-[-0.025em]">LiSCA</h1>
          <Show when={props.onOpenGuide || props.onChangeInterests}>
            <div class="flex flex-wrap items-center gap-2">
              <Show when={props.onOpenGuide}>
                <Button size="xs" type="button" variant="outline" onClick={props.onOpenGuide}>
                  How LiSCA helps your research
                </Button>
              </Show>
              <Show when={props.onChangeInterests}>
                <Button size="xs" type="button" variant="ghost" onClick={props.onChangeInterests}>
                  Change research interests
                </Button>
              </Show>
            </div>
          </Show>
        </div>
        <p class="text-sm leading-5 text-muted-foreground">
          Filter by research area to focus on relevant workflows, or open a saved assay.
        </p>
      </div>

      <div class="flex w-full flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
            1. Research area
          </span>
          <Show when={activeFilter() !== "all"}>
            <Button size="xs" type="button" variant="link" onClick={() => selectAreaFilter("all")}>
              Browse all assays
            </Button>
          </Show>
        </div>
        <div aria-label="Research area" class="flex flex-wrap gap-1.5" role="group">
          <For each={areaOptions()}>
            {(option) => {
              const active = () => activeFilter() === option.id;
              return (
                <Button
                  aria-pressed={active()}
                  size="sm"
                  type="button"
                  variant={active() ? "default" : "outline"}
                  onClick={() => selectAreaFilter(option.id)}
                >
                  {option.label}
                </Button>
              );
            }}
          </For>
        </div>
        <Show when={activeAreaSummary()}>
          {(summary) => <p class="text-xs leading-4 text-muted-foreground">{summary()}</p>}
        </Show>
      </div>

      <div class="flex w-full flex-col gap-2.5">
        <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
          2. Assay workflow
        </span>
        <div aria-label="Assay type" class="flex w-full flex-col gap-2.5" role="group">
          <For each={visibleAssayIds()}>
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
          <Show when={filtered().showLabelFree}>
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

      <Show when={props.onOpenFeedback}>
        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <span class="text-xs text-muted-foreground">
            Need another single-cell readout or experimental workflow?
          </span>
          <Button size="xs" type="button" variant="ghost" onClick={props.onOpenFeedback}>
            Help us improve LiSCA
          </Button>
        </div>
      </Show>
    </div>
  );
}
