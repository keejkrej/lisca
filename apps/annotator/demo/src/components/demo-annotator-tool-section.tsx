import { AnnotationToolGrid, buildAnnotationToolActions } from "@lisca/ui/features";
import { cn } from "@lisca/ui/components";
import { DockSection } from "@lisca/ui/shell";
import type { DockToolAction } from "@lisca/ui/shell";
import { For, Show } from "solid-js";
import type { Accessor } from "solid-js";

import type { DemoAnnotatorState } from "@lisca/web-demo";

import { labelColorStyle } from "../utils/annotation-utils";

function DemoAnnotatorToolToolbar(props: {
  canEditTools: boolean;
  toolActions: DockToolAction[];
  class?: string;
  shortcutsEnabled?: boolean;
}) {
  return (
    <AnnotationToolGrid
      canEditTools={props.canEditTools}
      class={props.class}
      shortcutsEnabled={props.shortcutsEnabled}
      toolActions={props.toolActions}
    />
  );
}

export function DemoAnnotatorToolSection(props: { state: Accessor<DemoAnnotatorState> }) {
  const canEditTools = () => props.state().mode === "segmentation";
  const toolActions = () =>
    buildAnnotationToolActions(props.state().tool, props.state().setTool, !canEditTools(), {
      viewable: Boolean(props.state().frame),
    });

  return (
    <Show when={props.state().mode === "segmentation"}>
      <DockSection title="Tool">
        <DemoAnnotatorToolToolbar canEditTools={canEditTools()} toolActions={toolActions()} />
      </DockSection>
    </Show>
  );
}

export function DemoInlineAnnotatorToolbar(props: {
  state: Accessor<DemoAnnotatorState>;
  embedded?: boolean;
}) {
  const canEditTools = () => props.state().mode === "segmentation";
  const toolActions = () =>
    buildAnnotationToolActions(props.state().tool, props.state().setTool, !canEditTools(), {
      viewable: Boolean(props.state().frame),
    });

  return (
    <div class="shrink-0 border-t border-border px-3 py-2">
      <div class="mx-auto flex w-full max-w-md flex-col gap-2">
        <Show when={props.embedded}>
          <div class="grid grid-cols-3 gap-1.5">
            <For each={props.state().labels}>
              {(label) => {
                const selected = () =>
                  props.state().mode === "classification"
                    ? props.state().annotation.current.classificationLabelId === label.id
                    : props.state().activeLabelId === label.id;
                return (
                  <button
                    class={cn(
                      "min-w-0 truncate rounded-md border px-2 py-1.5 text-center text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                    disabled={!props.state().canEdit}
                    style={labelColorStyle(label, selected())}
                    type="button"
                    title={label.name}
                    onClick={() => {
                      const current = props.state();
                      if (current.mode === "classification") {
                        current.annotation.commit({
                          classificationLabelId: selected() ? null : label.id,
                          mask: current.annotation.current.mask,
                        });
                      } else {
                        current.setActiveLabelId(label.id);
                      }
                    }}
                  >
                    {label.name}
                  </button>
                );
              }}
            </For>
          </div>
        </Show>
        <Show when={props.state().mode === "segmentation"}>
          <DemoAnnotatorToolToolbar
            canEditTools={canEditTools()}
            class="mx-auto flex w-full max-w-md flex-col gap-2"
            shortcutsEnabled={false}
            toolActions={toolActions()}
          />
        </Show>
      </div>
    </div>
  );
}
