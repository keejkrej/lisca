import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { basicInfoAssayTitle, useStudioStore } from "../studioStore";

const ROW = "flex min-h-[100px] w-full flex-col gap-2.5 p-2.5";

export function BasicInfoStep1() {
  const assayId = useStudioStore((s) => s.assayId);
  const info1 = useStudioStore((s) => s.info1);
  const setInfo1 = useStudioStore((s) => s.setInfo1);

  return (
    <div className="flex w-full min-w-0 max-w-[619px] flex-col gap-[30px] self-center">
      <h1 className="text-center font-normal text-4xl leading-tight text-foreground">
        {basicInfoAssayTitle(assayId)}
      </h1>

      <div className="flex w-full min-w-0 flex-col gap-2.5">
        <div className={ROW}>
          <Field className="gap-2.5" name="name">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-name">
              Name
            </FieldLabel>
            <Input
              id="studio-name"
              type="text"
              autoComplete="off"
              className="mt-0 w-full rounded-2xl border-2 px-5 py-2.5 text-2xl"
              value={info1.name}
              onChange={(e) => setInfo1({ name: e.target.value })}
              placeholder="mRNA lifetime test"
            />
          </Field>
        </div>
        <div className={ROW}>
          <Field className="gap-2.5" name="date">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-date">
              Date
            </FieldLabel>
            <Input
              id="studio-date"
              type="text"
              className="mt-0 w-full rounded-2xl border-2 px-5 py-2.5 text-2xl"
              value={info1.date}
              onChange={(e) => setInfo1({ date: e.target.value })}
              placeholder="20.04.2026"
            />
          </Field>
        </div>
        <div className={ROW}>
          <Field className="gap-2.5" name="dataPath">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-data-path">
              Data path
            </FieldLabel>
            <Input
              id="studio-data-path"
              type="text"
              className="mt-0 w-full rounded-2xl border-2 px-5 py-2.5 text-2xl"
              value={info1.dataPath}
              onChange={(e) => setInfo1({ dataPath: e.target.value })}
              placeholder="ag-moonraedler/projects/lifetime"
            />
          </Field>
        </div>
        <div className={ROW}>
          <Field className="gap-2.5" name="saveTo">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-save-to">
              Save to
            </FieldLabel>
            <Input
              id="studio-save-to"
              type="text"
              className="mt-0 w-full rounded-2xl border-2 px-5 py-2.5 text-2xl"
              value={info1.saveTo}
              onChange={(e) => setInfo1({ saveTo: e.target.value })}
              placeholder="ag-moonraedler/users/me/lifetime"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
