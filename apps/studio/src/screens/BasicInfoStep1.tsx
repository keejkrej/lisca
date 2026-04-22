import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useStudioStore } from "../studioStore";

export function BasicInfoStep1() {
  const info1 = useStudioStore((s) => s.info1);
  const setInfo1 = useStudioStore((s) => s.setInfo1);
  const goNext = useStudioStore((s) => s.goNext);
  const goBack = useStudioStore((s) => s.goBack);

  const valid = info1.studyName.trim().length > 0 && info1.operatorName.trim().length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Run details</CardTitle>
        <CardDescription>Identify the study and who is operating the instrument.</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-6">
        <Field name="studyName">
          <FieldLabel htmlFor="studio-study-name">Study name</FieldLabel>
          <FieldDescription>Shown on exported reports and audit trails.</FieldDescription>
          <Input
            id="studio-study-name"
            type="text"
            autoComplete="organization"
            value={info1.studyName}
            onChange={(e) => setInfo1({ studyName: e.target.value })}
            placeholder="e.g. NEURO-2026-Q1"
          />
        </Field>
        <Field name="operatorName">
          <FieldLabel htmlFor="studio-operator-name">Operator</FieldLabel>
          <FieldDescription>Full name or badge ID.</FieldDescription>
          <Input
            id="studio-operator-name"
            type="text"
            autoComplete="name"
            value={info1.operatorName}
            onChange={(e) => setInfo1({ operatorName: e.target.value })}
            placeholder="e.g. Alex Rivera"
          />
        </Field>
      </CardPanel>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t">
        <Button type="button" variant="outline" onClick={() => goBack()}>
          Back
        </Button>
        <Button type="button" disabled={!valid} onClick={() => goNext()}>
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}
