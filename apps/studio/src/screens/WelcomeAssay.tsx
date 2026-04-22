import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, Radio as RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { type AssayId, useStudioStore } from "../studioStore";

const ASSAYS: { id: AssayId; title: string; description: string }[] = [
  {
    id: "lisca-flex",
    title: "LISCA Flex",
    description: "Multi-analyte panel with flexible routing.",
  },
  {
    id: "lisca-standard",
    title: "LISCA Standard",
    description: "Fixed workflow optimized for throughput.",
  },
  {
    id: "custom-panel",
    title: "Custom panel",
    description: "Bring your own assay definition (advanced).",
  },
];

export function WelcomeAssay() {
  const assayId = useStudioStore((s) => s.assayId);
  const setAssayId = useStudioStore((s) => s.setAssayId);
  const goNext = useStudioStore((s) => s.goNext);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Choose an assay</CardTitle>
        <CardDescription>Select the run type for this session. You can change this later from settings.</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4">
        <RadioGroup
          className="grid gap-3"
          value={assayId ?? ""}
          onValueChange={(value) => {
            const v = value as AssayId | null | undefined;
            setAssayId(v && v.length > 0 ? v : null);
          }}
        >
          {ASSAYS.map((a) => {
            const selected = assayId === a.id;
            return (
              <label
                key={a.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-card p-4 shadow-xs/5 transition-colors",
                  selected && "border-primary ring-2 ring-ring/24",
                )}
              >
                <RadioGroupItem value={a.id} className="mt-0.5" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{a.title}</span>
                  <span className="text-muted-foreground text-sm">{a.description}</span>
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </CardPanel>
      <CardFooter className="flex justify-end border-t">
        <Button type="button" disabled={!assayId} onClick={() => goNext()}>
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}
