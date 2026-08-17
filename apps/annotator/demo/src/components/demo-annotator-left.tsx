import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
  ContrastControl,
} from "@lisca/ui/features";
import { PanelSection, RailSidebar } from "@lisca/ui/shell";
import { Show } from "solid-js";
import type { Accessor } from "solid-js";

import type { DemoAnnotatorState } from "@lisca/web-demo";

export function DemoAnnotatorLeft(props: { state: Accessor<DemoAnnotatorState> }) {
  const canEditTools = () => props.state().mode === "segmentation";
  const toolActions = () =>
    buildAnnotationToolActions(props.state().tool, props.state().setTool, !canEditTools(), {
      viewable: Boolean(props.state().frame),
    });

  return (
    <RailSidebar>
      <ContrastControl
        aria-label="Contrast"
        contrast={props.state().contrast}
        disabled={!props.state().frame}
        frame={props.state().frame}
        role="region"
        sectionAppearance="rail"
        sectionClassName="min-h-0 shrink-0"
        sectionContentClassName="flex min-h-0 flex-col"
        onContrastChange={props.state().setContrast}
      />
      <Show when={props.state().mode === "segmentation"}>
        <PanelSection appearance="rail" title="Tool">
          <AnnotationToolGrid
            canEditTools={canEditTools()}
            layout="rail"
            shortcutsEnabled
            toolActions={toolActions()}
          />
        </PanelSection>
      </Show>
    </RailSidebar>
  );
}
