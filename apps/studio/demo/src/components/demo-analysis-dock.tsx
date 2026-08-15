import type { ResultPlotSection } from "@lisca/analysis";
import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";

export function DemoAnalysisDock(props: {
  section: ResultPlotSection;
  sectionLabels: Record<ResultPlotSection, string>;
  onSectionChange: (section: ResultPlotSection) => void;
  compact?: boolean;
}) {
  const buttons = (
    <div class={props.compact ? "flex gap-2" : "flex flex-col gap-2"}>
      <Button
        class="w-full justify-center"
        size="sm"
        type="button"
        variant={props.section === "timeseries" ? "default" : "outline"}
        onClick={() => props.onSectionChange("timeseries")}
      >
        {props.sectionLabels.timeseries}
      </Button>
      <Button
        class="w-full justify-center"
        size="sm"
        type="button"
        variant={props.section === "parameters" ? "default" : "outline"}
        onClick={() => props.onSectionChange("parameters")}
      >
        {props.sectionLabels.parameters}
      </Button>
    </div>
  );

  if (props.compact) {
    return <div class="shrink-0 border-t border-border px-3 py-2">{buttons}</div>;
  }

  return (
    <DockStrip>
      <DockSection title="View">{buttons}</DockSection>
    </DockStrip>
  );
}
