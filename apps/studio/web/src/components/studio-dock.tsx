import { Section } from "@lisca/ui/shell";;
import type { ReactNode } from "react";

const columnClass = "flex min-h-0 min-w-0 basis-0 flex-col";

export function StudioDock({
  action,
  instruction,
  tool,
}: {
  action?: ReactNode;
  instruction?: string;
  tool?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full gap-3 p-3">
      <Section
        className={`${columnClass} flex-[2]`}
        contentClassName="flex min-h-0 flex-1 items-center justify-center"
        title="Instruction"
      >
        {instruction ? (
          <p className="line-clamp-4 text-center text-sm leading-snug">{instruction}</p>
        ) : null}
      </Section>
      <Section
        className={`${columnClass} flex-[3]`}
        contentClassName="flex min-h-0 flex-1 items-center justify-center"
        title="Tool"
      >
        {tool}
      </Section>
      <Section
        className={`${columnClass} flex-[2]`}
        contentClassName="flex min-h-0 flex-1 items-center justify-center"
        title="Action"
      >
        {action}
      </Section>
    </div>
  );
}
