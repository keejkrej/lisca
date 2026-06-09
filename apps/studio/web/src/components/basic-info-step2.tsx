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

import morphologyUrl from "../assets/features/morphology.svg?url";
import partcountUrl from "../assets/features/partcount.svg?url";
import partfluorUrl from "../assets/features/partfluor.svg?url";
import totalfluorUrl from "../assets/features/totalfluor.svg?url";
import {
  type BasicInfo2FeatureId,
  type TimelapseUnit,
  useStudioStore,
} from "../state/studio-store";
import { ASSAY_FEATURE, ASSAY_NAME } from "@lisca/contracts";

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
  const assayId = useStudioStore((state) => state.assayId);
  const info2 = useStudioStore((state) => state.info2);
  const setInfo2 = useStudioStore((state) => state.setInfo2);
  const isGeneExpression = assayId === ASSAY_NAME.GENE_EXPRESSION;
  const showFeaturePicker = isGeneExpression;
  const isSelected = (id: BasicInfo2FeatureId) =>
    Array.isArray(info2.selectedFeatures) && info2.selectedFeatures.includes(id);
  const selectedFeatures = Array.isArray(info2.selectedFeatures) ? info2.selectedFeatures : [];
  const selectableFeatures = FEATURES;
  const isFeatureDisabled = (id: BasicInfo2FeatureId) =>
    isGeneExpression && id !== ASSAY_FEATURE.TOTAL_FLUOR;

  const toggleFeature = (id: BasicInfo2FeatureId) => {
    if (assayId === ASSAY_NAME.GENE_EXPRESSION) {
      setInfo2({ selectedFeatures: [ASSAY_FEATURE.TOTAL_FLUOR] });
      return;
    }
    setInfo2({
      selectedFeatures: selectedFeatures.includes(id)
        ? selectedFeatures.filter((item) => item !== id)
        : [...selectedFeatures, id],
    });
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      <div className={ROW}>
        <Field className="gap-2.5" name="pattern">
          <FieldLabel className="text-2xl font-normal" id="studio-pattern-label">
            Pattern
          </FieldLabel>
          <Select
            value={info2.pattern || undefined}
            onValueChange={(pattern) => setInfo2({ pattern: pattern == null ? "" : pattern })}
          >
            <SelectTrigger aria-labelledby="studio-pattern-label" className="w-full">
              <SelectValue placeholder="Choose pattern" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="30 um">30 um</SelectItem>
              <SelectItem value="200 um">200 um</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className={ROW}>
        <Field className="gap-2.5" name="timelapseInterval">
          <FieldLabel className="text-2xl font-normal" id="studio-timelapse-label">
            Timelapse interval
          </FieldLabel>
          <div className="mt-0 flex w-full min-w-0 flex-row flex-wrap items-stretch gap-2.5">
            <Input
              aria-labelledby="studio-timelapse-label"
              className="min-w-0 flex-1"
              min={1}
              placeholder="10"
              step={1}
              type="number"
              value={info2.timelapseAmount ?? ""}
              onChange={(event) => {
                const value = event.target.value.trim() === "" ? null : Number(event.target.value);
                setInfo2({ timelapseAmount: value == null || Number.isNaN(value) ? null : value });
              }}
            />
            <Select
              value={info2.timelapseUnit}
              onValueChange={(unit) => setInfo2({ timelapseUnit: unit as TimelapseUnit })}
            >
              <SelectTrigger
                aria-labelledby="studio-timelapse-label"
                className="w-[11rem] shrink-0 sm:w-[10.5rem]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {TIMELAPSE_UNITS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Field>
      </div>
      {showFeaturePicker && selectableFeatures.length > 0 ? (
        <div className="min-h-[200px] w-full p-2.5">
          <Field className="h-full min-h-[200px] gap-2.5" name="features">
            <FieldLabel className="text-2xl font-normal">Features</FieldLabel>
            <div
              aria-label="Feature type"
              className="mt-0 grid min-h-0 w-full min-w-0 grid-cols-2 gap-2.5 p-2.5 sm:grid-cols-4"
            >
              {selectableFeatures.map(({ id, title }) => {
                const selected = isSelected(id);
                return (
                  <label
                    key={id}
                    className={cn(
                      "relative flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-2.5 transition-shadow",
                      selected
                        ? "border-foreground/80 ring-1 ring-foreground/20"
                        : "border-border opacity-60 hover:opacity-100",
                      isFeatureDisabled(id) && "cursor-not-allowed opacity-40",
                    )}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={isFeatureDisabled(id)}
                  >
                    <input
                      className="absolute inset-0 z-10 cursor-pointer opacity-0"
                      checked={selected}
                      name="studio-feature"
                      type="checkbox"
                      value={id}
                      onChange={() => toggleFeature(id)}
                      disabled={isFeatureDisabled(id)}
                    />
                    <span className="sr-only">{title}</span>
                    <img
                      alt=""
                      className="z-0 h-[120px] w-full object-contain"
                      src={FEATURE_IMAGE_URL[id]}
                    />
                  </label>
                );
              })}
            </div>
          </Field>
        </div>
      ) : null}
    </div>
  );
}
