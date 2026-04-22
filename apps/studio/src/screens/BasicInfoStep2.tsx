import { Field, FieldLabel } from "@/components/ui/field";
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
} from "@/components/ui/number-field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import morphologyUrl from "@/assets/features/morphology.svg?url";
import partcountUrl from "@/assets/features/partcount.svg?url";
import partfluorUrl from "@/assets/features/partfluor.svg?url";
import totalfluorUrl from "@/assets/features/totalfluor.svg?url";
import {
  basicInfoAssayTitle,
  type BasicInfo2FeatureId,
  type TimelapseUnit,
  useStudioStore,
} from "../studioStore";

const ROW = "flex min-h-[100px] w-full flex-col gap-2.5 p-2.5";

const FEATURES: { id: BasicInfo2FeatureId; title: string }[] = [
  { id: "morphology", title: "Morphology" },
  { id: "partcount", title: "Part count" },
  { id: "partfluor", title: "Part fluor" },
  { id: "totalfluor", title: "Total fluor" },
];

const FEATURE_IMAGE_URL: Record<BasicInfo2FeatureId, string> = {
  morphology: morphologyUrl,
  partcount: partcountUrl,
  partfluor: partfluorUrl,
  totalfluor: totalfluorUrl,
};

const TIMELAPSE_UNITS: { value: TimelapseUnit; label: string }[] = [
  { value: "second", label: "second" },
  { value: "minute", label: "minute" },
  { value: "hour", label: "hour" },
];

function FeaturePreview({ id }: { id: BasicInfo2FeatureId }) {
  return (
    <div
      aria-hidden
      className="flex h-[120px] w-full max-w-[122px] items-center justify-center"
    >
      <img
        src={FEATURE_IMAGE_URL[id]}
        alt=""
        className="h-[120px] w-full object-contain"
      />
    </div>
  );
}

/** Second part of Basic info — Figma node 43:97 (nav stays “Basic info”). */
export function BasicInfoStep2() {
  const assayId = useStudioStore((s) => s.assayId);
  const info2 = useStudioStore((s) => s.info2);
  const setInfo2 = useStudioStore((s) => s.setInfo2);

  return (
    <div className="flex w-full min-w-0 flex-col gap-[30px]">
      <h1 className="text-center font-normal text-4xl leading-tight text-foreground">
        {basicInfoAssayTitle(assayId)}
      </h1>

      <div className="flex w-full min-w-0 flex-col gap-2.5">
        <div className={ROW}>
          <Field className="gap-2.5" name="pattern">
            <FieldLabel className="text-2xl font-normal" id="studio-pattern-label">
              Pattern
            </FieldLabel>
            <Select
              value={info2.pattern || undefined}
              onValueChange={(pattern) =>
                setInfo2({ pattern: pattern == null ? "" : pattern })
              }
            >
              <SelectTrigger
                aria-labelledby="studio-pattern-label"
                className="w-full"
              >
                <SelectValue placeholder="Choose pattern" />
              </SelectTrigger>
              <SelectPopup align="start" className="min-w-(--anchor-width)">
                <SelectItem value="30 um">30 μm</SelectItem>
                <SelectItem value="200 um">200 μm</SelectItem>
              </SelectPopup>
            </Select>
          </Field>
        </div>

        <div className={ROW}>
          <Field className="gap-2.5" name="timelapseInterval">
            <FieldLabel className="text-2xl font-normal" id="studio-timelapse-label">
              Timelapse interval
            </FieldLabel>
            <div className="mt-0 flex w-full min-w-0 flex-row flex-wrap items-stretch gap-2.5">
              <NumberField
                className="min-w-0 flex-1 gap-0"
                id="studio-timelapse-amount"
                min={1}
                step={1}
                value={info2.timelapseAmount ?? undefined}
                onValueChange={(value) =>
                  setInfo2({
                    timelapseAmount:
                      value === null || Number.isNaN(value) ? null : value,
                  })
                }
              >
                <NumberFieldGroup>
                  <NumberFieldInput
                    aria-labelledby="studio-timelapse-label"
                    placeholder="10"
                  />
                </NumberFieldGroup>
              </NumberField>

              <Select
                value={info2.timelapseUnit}
                onValueChange={(unit) =>
                  setInfo2({ timelapseUnit: unit as TimelapseUnit })
                }
              >
                <SelectTrigger
                  aria-labelledby="studio-timelapse-label"
                  className="w-[11rem] shrink-0 sm:w-[10.5rem]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup align="end" className="min-w-(--anchor-width)">
                  {TIMELAPSE_UNITS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          </Field>
        </div>

        <div className="min-h-[200px] w-full p-2.5">
          <Field className="h-full min-h-[200px] gap-2.5" name="features">
            <FieldLabel className="text-2xl font-normal">Features</FieldLabel>
            <div
              className="mt-0 flex min-h-0 w-full min-w-0 flex-1 gap-2.5 p-2.5"
              role="listbox"
              aria-label="Feature type"
            >
              {FEATURES.map(({ id, title }) => {
                const selected = info2.selectedFeature === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center rounded-2xl border-2 p-2.5 transition-shadow",
                      selected
                        ? "border-foreground/80 ring-1 ring-foreground/20"
                        : "border-border opacity-60 hover:opacity-100",
                    )}
                    onClick={() => setInfo2({ selectedFeature: id })}
                  >
                    <span className="sr-only">{title}</span>
                    <FeaturePreview id={id} />
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}
