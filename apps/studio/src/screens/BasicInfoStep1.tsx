import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useStudioStore } from "../studioStore";

const ROW = "min-h-[100px] w-full max-w-[619px] self-center";

export function BasicInfoStep1() {
  const info1 = useStudioStore((s) => s.info1);
  const setInfo1 = useStudioStore((s) => s.setInfo1);

  return (
    <div className="flex w-full min-w-0 flex-col">
      <h1 className="px-0.5 text-center font-semibold text-2xl leading-tight sm:text-3xl">
        Gene expression assay
      </h1>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        Enter study and run metadata for the instrument session.
      </p>

      <div className="mt-8 flex w-full min-w-0 flex-col items-center gap-2.5 sm:mt-10 sm:gap-2.5">
        <div className={ROW}>
          <Field name="studyName">
            <FieldLabel htmlFor="studio-study-name">Study name</FieldLabel>
            <FieldDescription>Shown on exported reports and audit trails.</FieldDescription>
            <Input
              id="studio-study-name"
              type="text"
              autoComplete="organization"
              className="mt-2 w-full"
              value={info1.studyName}
              onChange={(e) => setInfo1({ studyName: e.target.value })}
              placeholder="e.g. NEURO-2026-Q1"
            />
          </Field>
        </div>
        <div className={ROW}>
          <Field name="operatorName">
            <FieldLabel htmlFor="studio-operator-name">Operator</FieldLabel>
            <FieldDescription>Full name or badge ID.</FieldDescription>
            <Input
              id="studio-operator-name"
              type="text"
              autoComplete="name"
              className="mt-2 w-full"
              value={info1.operatorName}
              onChange={(e) => setInfo1({ operatorName: e.target.value })}
              placeholder="e.g. Alex Rivera"
            />
          </Field>
        </div>
        <div className={ROW}>
          <Field name="instrumentId">
            <FieldLabel htmlFor="studio-instrument-id">Instrument ID</FieldLabel>
            <FieldDescription>Reader or workcell identifier for this run.</FieldDescription>
            <Input
              id="studio-instrument-id"
              type="text"
              className="mt-2 w-full"
              value={info1.instrumentId}
              onChange={(e) => setInfo1({ instrumentId: e.target.value })}
              placeholder="e.g. WC-12"
            />
          </Field>
        </div>
        <div className={ROW}>
          <Field name="lotId">
            <FieldLabel htmlFor="studio-lot-id">Reagent lot</FieldLabel>
            <FieldDescription>Panel or reagent lot reference (required).</FieldDescription>
            <Input
              id="studio-lot-id"
              type="text"
              className="mt-2 w-full"
              value={info1.lotId}
              onChange={(e) => setInfo1({ lotId: e.target.value })}
              placeholder="e.g. LOT-482A"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
