import { dockLayout3Class, dockSectionClass, Section } from "@lisca/ui/shell";
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
    <div className={dockLayout3Class}>
      <Section
        className={dockSectionClass}
        contentClassName="flex min-h-0 items-center justify-center space-y-0"
        title="Instruction"
      >
        {instruction ? (
          <p className="line-clamp-4 text-center text-sm leading-snug">{instruction}</p>
        ) : null}
      </Section>
      <Section
        className={dockSectionClass}
        contentClassName="flex min-h-0 items-center justify-center space-y-0"
        title="Tool"
      >
        {tool}
      </Section>
      <Section
        className={dockSectionClass}
        contentClassName="flex min-h-0 items-center justify-center space-y-0"
        title="Action"
      >
        {action}
      </Section>
    </div>
  );
}
