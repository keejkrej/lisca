import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ASSAY_CHOICE_LABEL, type AssayId, useStudioStore } from "../studioStore";

const ASSAY_ORDER: AssayId[] = [
  "gene-expression",
  "immune-killing",
  "lnp-binding",
  "custom-assay",
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
        {ASSAY_ORDER.map((id) => {
          const selected = assayId === id;
          return (
            <Button
              key={id}
              aria-pressed={selected}
              className={cn(
                "h-20 w-full min-h-[5rem] items-center justify-center px-2 py-3 text-center sm:h-[5.5rem] sm:min-h-[5.5rem] sm:px-3",
                selected && "border-primary ring-2 ring-ring/24 bg-primary/6 hover:bg-primary/10",
              )}
              onClick={() => {
                setAssayId(id);
              }}
              type="button"
              variant="outline"
            >
              <span className="text-center font-medium text-sm sm:text-base">
                {ASSAY_CHOICE_LABEL[id]}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
