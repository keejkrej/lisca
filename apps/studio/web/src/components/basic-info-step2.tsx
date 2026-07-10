import { ASSAY_FEATURE, ASSAY_TYPE } from "@lisca/contracts/assay";
import {
  cn,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lisca/ui/components";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
import { createMemo, For, Show } from "solid-js";

import morphologyUrl from "../assets/features/morphology.svg?url";
import partcountUrl from "../assets/features/partcount.svg?url";
import partfluorUrl from "../assets/features/partfluor.svg?url";
import totalfluorUrl from "../assets/features/totalfluor.svg?url";
import {
  type BasicInfo2FeatureId,
  type TimelapseUnit,
  studioWizardActions,
  studioWizardAtom,
} from "../state/studio-store";

const ROW = "flex min-h-[100px] w-full flex-col gap-2.5 p-2.5";
const FEATURES: { id: BasicInfo2FeatureId; title: string }[] = [
  { id: ASSAY_FEATURE.MORPHOLOGY, title: "Morphology" },
  { id: ASSAY_FEATURE.PART_COUNT, title: "Part count" },
  { id: ASSAY_FEATURE.PART_FLUOR, title: "Part fluor" },
  { id: ASSAY_FEATURE.TOTAL_FLUOR, title: "Total fluor" },
];

const FEATURE_IMAGE_URL: Record<BasicInfo2FeatureId, string> = {
  [ASSAY_FEATURE.MORPHOLOGY]: morphologyUrl,
  [ASSAY_FEATURE.PART_COUNT]: partcountUrl,
  [ASSAY_FEATURE.PART_FLUOR]: partfluorUrl,
  [ASSAY_FEATURE.TOTAL_FLUOR]: totalfluorUrl,
};
const TIMELAPSE_UNITS: { value: TimelapseUnit; label: string }[] = [
  { value: "second", label: "Second" },
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
];

export function BasicInfoStep2() {
  const wizard = useAtomValue(studioWizardAtom);
  const setWizard = useAtomSet(studioWizardAtom);
  const setInfo2 = (patch: Parameters<typeof studioWizardActions.setInfo2>[1]) =>
    studioWizardActions.setInfo2(setWizard, patch);

  const isGeneExpression = createMemo(() => wizard().assayId === ASSAY_TYPE.GENE_EXPRESSION);
  const selectedFeatures = createMemo(() =>
    Array.isArray(wizard().info2.selectedFeatures) ? wizard().info2.selectedFeatures : [],
  );
  const isSelected = (id: BasicInfo2FeatureId) => selectedFeatures().includes(id);
  const isFeatureDisabled = (id: BasicInfo2FeatureId) =>
    isGeneExpression() && id !== ASSAY_FEATURE.TOTAL_FLUOR;

  const toggleFeature = (id: BasicInfo2FeatureId) => {
    if (wizard().assayId === ASSAY_TYPE.GENE_EXPRESSION) {
      setInfo2({ selectedFeatures: [ASSAY_FEATURE.TOTAL_FLUOR] });
      return;
    }
    const current = selectedFeatures();
    setInfo2({
      selectedFeatures: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    });
  };

  return (
    <div class="flex w-full min-w-0 flex-col gap-2.5">
      <div class={ROW}>
        <Field class="gap-2.5" name="pattern">
          <FieldLabel class="text-2xl font-normal" id="studio-pattern-label">
            Pattern
          </FieldLabel>
          <Select
            value={wizard().info2.pattern || undefined}
            onValueChange={(pattern) => setInfo2({ pattern: pattern == null ? "" : pattern })}
          >
            <SelectTrigger aria-labelledby="studio-pattern-label" class="w-full">
              <SelectValue placeholder="Choose pattern" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="30 um">30 um</SelectItem>
              <SelectItem value="200 um">200 um</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div class={ROW}>
        <Field class="gap-2.5" name="timelapseInterval">
          <FieldLabel class="text-2xl font-normal" id="studio-timelapse-label">
            Timelapse interval
          </FieldLabel>
          <div class="mt-0 flex w-full min-w-0 flex-row flex-wrap items-stretch gap-2.5">
            <Input
              aria-labelledby="studio-timelapse-label"
              class="min-w-0 flex-1"
              min={1}
              placeholder="10"
              step={1}
              type="number"
              value={wizard().info2.timelapseAmount ?? ""}
              onChange={(event) => {
                const raw = event.currentTarget.value;
                const value = raw.trim() === "" ? null : Number(raw);
                setInfo2({ timelapseAmount: value == null || Number.isNaN(value) ? null : value });
              }}
            />
            <Select
              value={wizard().info2.timelapseUnit}
              onValueChange={(unit) => setInfo2({ timelapseUnit: unit as TimelapseUnit })}
            >
              <SelectTrigger
                aria-labelledby="studio-timelapse-label"
                class="w-[11rem] shrink-0 sm:w-[10.5rem]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <For each={TIMELAPSE_UNITS}>
                  {({ value, label }) => (
                    <SelectItem value={value}>{label}</SelectItem>
                  )}
                </For>
              </SelectContent>
            </Select>
          </div>
        </Field>
      </div>
      <Show when={isGeneExpression() && FEATURES.length > 0}>
        <div class="min-h-[200px] w-full p-2.5">
          <Field class="h-full min-h-[200px] gap-2.5" name="features">
            <FieldLabel class="text-2xl font-normal">Features</FieldLabel>
            <div
              aria-label="Feature type"
              class="mt-0 grid min-h-0 w-full min-w-0 grid-cols-2 gap-2.5 p-2.5 sm:grid-cols-4"
            >
              <For each={FEATURES}>
                {({ id, title }) => {
                  const selected = () => isSelected(id);
                  const disabled = () => isFeatureDisabled(id);
                  return (
                    <label
                      class={cn(
                        "relative flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-2.5 transition-shadow",
                        selected()
                          ? "border-foreground/80 ring-1 ring-foreground/20"
                          : "border-border opacity-60 hover:opacity-100",
                        disabled() && "cursor-not-allowed opacity-40",
                      )}
                      role="option"
                      aria-selected={selected()}
                      aria-disabled={disabled()}
                    >
                      <input
                        class="absolute inset-0 z-10 cursor-pointer opacity-0"
                        checked={selected()}
                        name="studio-feature"
                        type="checkbox"
                        value={id}
                        onChange={() => toggleFeature(id)}
                        disabled={disabled()}
                      />
                      <span class="sr-only">{title}</span>
                      <img
                        alt=""
                        class="z-0 h-[120px] w-full object-contain"
                        src={FEATURE_IMAGE_URL[id]}
                      />
                    </label>
                  );
                }}
              </For>
            </div>
          </Field>
        </div>
      </Show>
    </div>
  );
}