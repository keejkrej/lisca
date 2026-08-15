import { PanelSection, SidebarStack } from "@lisca/ui/shell";

export function DemoAnalysisRight(props: {
  title: string;
  instruction: string;
  fileCount: number;
}) {
  return (
    <SidebarStack class="p-0">
      <PanelSection title="Instruction">
        <p class="text-sm leading-snug text-muted-foreground">{props.instruction}</p>
      </PanelSection>
      <PanelSection title="Analysis">
        <div class="flex flex-col gap-1 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Assay</span>
            <span class="font-medium">{props.title}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Result files</span>
            <span class="font-medium tabular-nums">{props.fileCount}</span>
          </div>
        </div>
      </PanelSection>
    </SidebarStack>
  );
}
