import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
} from "@lisca/ui/features";
import { DockSection } from "@lisca/ui/shell";
import type { DockToolAction } from "@lisca/ui/shell";

import type { DemoAnnotatorState } from "../state/use-demo-annotator-state";

function DemoAnnotatorToolToolbar(props: {
  canEditTools: boolean;
  toolActions: DockToolAction[];
  className?: string;
  shortcutsEnabled?: boolean;
}) {
  return (
    <AnnotationToolGrid
      canEditTools={props.canEditTools}
      className={props.className}
      shortcutsEnabled={props.shortcutsEnabled}
      toolActions={props.toolActions}
    />
  );
}

export function DemoAnnotatorToolSection({ state }: { state: DemoAnnotatorState }) {
  const canEditTools = state.mode === "segmentation";
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);

  return (
    <DockSection title="Tool">
      {state.mode === "segmentation" ? (
        <DemoAnnotatorToolToolbar canEditTools={canEditTools} toolActions={toolActions} />
      ) : (
        <div className="flex min-h-[4.5rem] items-center justify-center text-muted-foreground text-xs">
          Classification
        </div>
      )}
    </DockSection>
  );
}

export function DemoInlineAnnotatorToolbar({ state }: { state: DemoAnnotatorState }) {
  const canEditTools = state.mode === "segmentation";
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);

  return (
    <div className="shrink-0 border-t border-border px-3 py-2">
      {state.mode === "segmentation" ? (
        <DemoAnnotatorToolToolbar
          canEditTools={canEditTools}
          className="mx-auto flex w-full max-w-md flex-col gap-2"
          shortcutsEnabled={false}
          toolActions={toolActions}
        />
      ) : (
        <div className="flex min-h-[4.5rem] items-center justify-center text-muted-foreground text-xs">
          Classification
        </div>
      )}
    </div>
  );
}
