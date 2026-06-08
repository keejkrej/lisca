import { dockLayoutClass, dockSectionClass, Section } from "@lisca/ui/shell";
import type { ReactNode } from "react";

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
    <div className={dockLayoutClass}>
      <Section
        className={`${dockSectionClass} flex-[2]`}
        contentClassName="flex min-h-0 flex-1 items-center justify-center"
        title="Instruction"
      >
        {instruction ? (
          <p className="line-clamp-4 text-center text-sm leading-snug">{instruction}</p>
        ) : null}
      </Section>
      <Section
        className={`${dockSectionClass} flex-[3]`}
        contentClassName="flex min-h-0 flex-1 items-center justify-center"
        title="Tool"
      >
        {tool}
      </Section>
      <Section
        className={`${dockSectionClass} flex-[2]`}
        contentClassName="flex min-h-0 flex-1 items-center justify-center"
        title="Action"
      >
        {action}
      </Section>
    </div>
  );
}
