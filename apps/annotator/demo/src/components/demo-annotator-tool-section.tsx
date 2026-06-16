import {
  AnnotationToolGrid,
  AnnotationModeToggle,
  buildAnnotationToolActions,
} from "@lisca/ui/features";
import { cn } from "@lisca/ui/components";
import { DockSection } from "@lisca/ui/shell";
import type { DockToolAction } from "@lisca/ui/shell";
import { CircleHelp } from "lucide-react";

import type { DemoAnnotatorState } from "@lisca/web-demo";

import { labelColorStyle } from "../utils/annotation-utils";

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

export function DemoInlineAnnotatorToolbar({
  state,
  embedded = false,
}: {
  state: DemoAnnotatorState;
  embedded?: boolean;
}) {
  const canEditTools = state.mode === "segmentation";
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);

  return (
    <div className="shrink-0 border-t border-border px-3 py-2">
      <div className="mx-auto flex w-full max-w-md flex-col gap-2">
        {embedded ? (
          <>
            <div className="flex items-center gap-2">
              <AnnotationModeToggle
                className="min-w-0 flex-1"
                mode={state.mode}
                onModeChange={state.setMode}
              />
              <button
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                title="Segmentation draws outlines per label. Classification assigns one phenotype label to the whole site — no brush work."
                aria-label="Segmentation vs classification"
              >
                <CircleHelp className="size-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {state.labels.map((label) => {
                const selected =
                  state.mode === "classification"
                    ? state.annotation.current.classificationLabelId === label.id
                    : state.activeLabelId === label.id;
                return (
                  <button
                    key={label.id}
                    className={cn(
                      "min-w-0 truncate rounded-md border px-2 py-1.5 text-center text-[0.65rem] font-medium disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                    disabled={!state.canEdit}
                    style={labelColorStyle(label, selected)}
                    type="button"
                    title={label.name}
                    onClick={() => {
                      if (state.mode === "classification") {
                        state.annotation.commit({
                          classificationLabelId: selected
                            ? null
                            : label.id,
                          mask: state.annotation.current.mask,
                        });
                      } else {
                        state.setActiveLabelId(label.id);
                      }
                    }}
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
        {state.mode === "segmentation" ? (
          <DemoAnnotatorToolToolbar
            canEditTools={canEditTools}
            className="mx-auto flex w-full max-w-md flex-col gap-2"
            shortcutsEnabled={false}
            toolActions={toolActions}
          />
        ) : (
          <div className="flex min-h-[4.5rem] items-center justify-center px-2 text-center text-muted-foreground text-xs">
            Click a label above to classify this site
          </div>
        )}
      </div>
    </div>
  );
}
