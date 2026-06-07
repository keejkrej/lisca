import { Button, cn } from "@lisca/ui";

import { ASSAY_CHOICE_LABEL, type AssayId, useStudioStore } from "../state/studio-store";
import { ASSAY_NAME } from "@lisca/contracts";

const ASSAY_ORDER: AssayId[] = [
  ASSAY_NAME.GENE_EXPRESSION,
  ASSAY_NAME.IMMUNE_KILLING,
  ASSAY_NAME.LNP_BINDING,
  ASSAY_NAME.CUSTOM_ASSAY,
];
const ENABLED_ASSAY_ID: AssayId = ASSAY_NAME.GENE_EXPRESSION;

export function ChooseAssay() {
  const assayId = useStudioStore((state) => state.assayId);
  const setAssayId = useStudioStore((state) => state.setAssayId);

  return (
    <div className="flex w-full min-w-0 flex-col items-center">
      <h1 className="text-center font-semibold text-4xl tracking-tight sm:text-5xl">LiSCA</h1>
      <div
        aria-label="Assay type"
        className="mt-8 grid w-full max-w-[28rem] grid-cols-2 gap-3 sm:mt-10 sm:gap-4"
        role="group"
      >
        {ASSAY_ORDER.map((id) => {
          const selected = assayId === id;
          const disabled = id !== ENABLED_ASSAY_ID;
          return (
            <Button
              key={id}
              aria-pressed={selected}
              className={cn(
                "h-20 w-full min-h-[5rem] items-center justify-center px-2 py-3 text-center sm:h-[5.5rem] sm:min-h-[5.5rem] sm:px-3",
                selected && "border-primary bg-primary/6 ring-2 ring-ring/24 hover:bg-primary/10",
              )}
              disabled={disabled}
              type="button"
              variant="outline"
              onClick={() => setAssayId(id)}
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
