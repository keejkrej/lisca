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
import { Textarea } from "@/components/ui/textarea";
import { useStudioStore } from "../studioStore";

export function BasicInfoStep2() {
  const info2 = useStudioStore((s) => s.info2);
  const setInfo2 = useStudioStore((s) => s.setInfo2);
  const goBack = useStudioStore((s) => s.goBack);
  const submit = useStudioStore((s) => s.submit);

  const valid = info2.sampleId.trim().length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sample</CardTitle>
        <CardDescription>Link this run to a sample and optional notes.</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-6">
        <Field name="sampleId">
          <FieldLabel htmlFor="studio-sample-id">Sample ID</FieldLabel>
          <FieldDescription>Required. Use your LIMS or tube barcode.</FieldDescription>
          <Input
            id="studio-sample-id"
            type="text"
            value={info2.sampleId}
            onChange={(e) => setInfo2({ sampleId: e.target.value })}
            placeholder="e.g. SPL-10482-B"
          />
        </Field>
        <Field name="runNotes">
          <FieldLabel htmlFor="studio-run-notes">Notes</FieldLabel>
          <FieldDescription>Optional context for collaborators.</FieldDescription>
          <Textarea
            id="studio-run-notes"
            value={info2.runNotes}
            onChange={(e) => setInfo2({ runNotes: e.target.value })}
            placeholder="Optional"
            rows={4}
          />
        </Field>
      </CardPanel>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t">
        <Button type="button" variant="outline" onClick={() => goBack()}>
          Back
        </Button>
        <Button type="button" disabled={!valid} onClick={() => submit()}>
          Submit
        </Button>
      </CardFooter>
    </Card>
  );
}
