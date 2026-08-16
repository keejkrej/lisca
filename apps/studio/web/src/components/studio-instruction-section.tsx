import { PanelSection } from "@lisca/ui/shell";

export function StudioInstructionSection(props: { text: string }) {
  return (
    <PanelSection appearance="rail" title="Instruction">
      <p class="text-[13px] leading-[18px] text-muted-foreground">{props.text}</p>
    </PanelSection>
  );
}
