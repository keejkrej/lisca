import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type AssayId, useStudioStore } from "../studioStore";

const ASSAYS: { id: AssayId; label: string }[] = [
  { id: "gene-expression", label: "Gene expression" },
  { id: "immune-killing", label: "Immune killing" },
  { id: "lnp-binding", label: "LNP binding" },
  { id: "custom-assay", label: "Custom assay" },
];

export function WelcomeAssay() {
  const assayId = useStudioStore((s) => s.assayId);
  const setAssayId = useStudioStore((s) => s.setAssayId);

  return (
    <div className="flex w-full min-w-0 flex-col items-center">
      <h1 className="text-center font-semibold text-4xl tracking-tight sm:text-5xl">LiSCA</h1>

      <div
        className="mt-8 grid w-full max-w-[28rem] grid-cols-2 gap-3 sm:mt-10 sm:gap-4"
        aria-label="Assay type"
        role="group"
      >
        {ASSAYS.map((a) => {
          const selected = assayId === a.id;
          return (
            <Button
              key={a.id}
              aria-pressed={selected}
              className={cn(
                "h-20 w-full min-h-[5rem] items-center justify-center px-2 py-3 text-center sm:h-[5.5rem] sm:min-h-[5.5rem] sm:px-3",
                selected && "border-primary ring-2 ring-ring/24 bg-primary/6 hover:bg-primary/10",
              )}
              onClick={() => {
                setAssayId(a.id);
              }}
              type="button"
              variant="outline"
            >
              <span className="text-center font-medium text-sm sm:text-base">{a.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
