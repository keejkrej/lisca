import { DockSection } from "@lisca/ui/shell";

export function StudioInstructionSection({ children }: { children: string }) {
  return (
    <DockSection title="Instruction">
      <p className="line-clamp-4 text-center text-sm leading-snug">{children}</p>
    </DockSection>
  );
}
