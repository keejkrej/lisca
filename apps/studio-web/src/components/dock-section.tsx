import { Section } from "@lisca/ui";
import type { ReactNode } from "react";

export function DockSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Section
      className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
      contentClassName="flex min-h-0 w-full flex-1 items-center justify-center"
      title={title}
    >
      {children}
    </Section>
  );
}
