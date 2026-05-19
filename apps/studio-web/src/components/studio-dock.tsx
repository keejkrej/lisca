import { Section } from "@lisca/ui";
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
  if (!action && !instruction && !tool) return null;

  return (
    <div className="flex h-full min-h-0 w-full gap-3 p-3">
      {instruction ? (
        <Section
          className="flex min-h-0 min-w-0 flex-[0.75] basis-0 flex-col"
          contentClassName="flex min-h-0 flex-1 items-center justify-center"
          title="Instruction"
        >
          <p className="line-clamp-4 text-center text-sm leading-snug">{instruction}</p>
        </Section>
      ) : null}
      {tool}
      {action ? (
        <Section
          className="flex min-h-0 min-w-0 flex-[0.65] basis-0 flex-col"
          contentClassName="flex min-h-0 flex-1 items-center justify-center"
          title="Action"
        >
          {action}
        </Section>
      ) : null}
    </div>
  );
}
