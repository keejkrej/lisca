import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import morphologyUrl from "@/assets/features/morphology.svg?url";
import partcountUrl from "@/assets/features/partcount.svg?url";
import partfluorUrl from "@/assets/features/partfluor.svg?url";
import totalfluorUrl from "@/assets/features/totalfluor.svg?url";
import {
  basicInfoAssayTitle,
  type BasicInfo2FeatureId,
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
    <div className="flex w-full min-w-0 max-w-[619px] flex-col gap-[30px] self-center">
      <h1 className="text-center font-normal text-4xl leading-tight text-foreground">
        {basicInfoAssayTitle(assayId)}
      </h1>

      <div className="flex w-full min-w-0 flex-col gap-2.5">
        <div className={ROW}>
          <Field className="gap-2.5" name="pattern">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-pattern">
              Pattern
            </FieldLabel>
            <Input
              id="studio-pattern"
              type="text"
              className="mt-0 w-full rounded-2xl border-2 border-border bg-transparent px-5 py-2.5 text-2xl text-foreground placeholder:text-muted-foreground"
              value={info2.pattern}
              onChange={(e) => setInfo2({ pattern: e.target.value })}
              placeholder="30 um / 200 um"
            />
          </Field>
        </div>

        <div className={ROW}>
          <Field className="gap-2.5" name="timelapseInterval">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-timelapse">
              Timelapse interval
            </FieldLabel>
            <Input
              id="studio-timelapse"
              type="text"
              className="mt-0 w-full rounded-2xl border-2 border-border bg-transparent px-5 py-2.5 text-2xl text-foreground placeholder:text-muted-foreground"
              value={info2.timelapseInterval}
              onChange={(e) => setInfo2({ timelapseInterval: e.target.value })}
              placeholder="10 min"
            />
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
