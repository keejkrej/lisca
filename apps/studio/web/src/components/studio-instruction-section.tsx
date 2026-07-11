import { PanelSection } from "@lisca/ui/shell";

export function StudioInstructionSection(props: { text: string }) {
  return (
    <PanelSection title="Instruction">
      <p class="text-sm leading-snug text-muted-foreground">{props.text}</p>
    </PanelSection>
  );
}
