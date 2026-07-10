import { AlignGridShapeToggle, AlignToolSection, AlignToolToolbar } from "@lisca/ui/features";
import { DockStrip } from "@lisca/ui/shell";
import { Show } from "solid-js";
import type { Accessor } from "solid-js";

import { DemoAlignDownloadButton } from "./demo-align-download-button";
import { DemoAlignSaveSection } from "./demo-align-save-section";
import type { DemoAlignState } from "@lisca/web-demo";

export function DemoAlignToolSection(props: { state: Accessor<DemoAlignState> }) {
  return (
    <AlignToolSection
      mode={props.state().toolMode}
      patternZoomLocked={props.state().patternZoomLocked}
      onModeChange={props.state().setToolMode}
      onPatternZoomLockedChange={props.state().setPatternZoomLocked}
    />
  );
}

export function DemoAlignDock(props: { state: Accessor<DemoAlignState> }) {
  return (
    <DockStrip>
      <DemoAlignToolSection state={props.state} />
      <DemoAlignSaveSection state={props.state} />
    </DockStrip>
  );
}

/** Compact toolbar for embedded landing previews and narrow viewports. */
export function DemoInlineAlignToolbar(props: {
  state: Accessor<DemoAlignState>;
  showShapeToggle?: boolean;
  showDownload?: boolean;
}) {
  return (
    <div class="shrink-0 border-t border-border px-3 py-2">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-2">
        <Show when={props.showShapeToggle ?? true}>
          <AlignGridShapeToggle
            disabled={!props.state().frame}
            shape={props.state().grid.shape}
            onShapeChange={(shape) =>
              props.state().setGrid((grid) => ({
                ...grid,
                shape,
              }))
            }
          />
        </Show>
        <AlignToolToolbar
          mode={props.state().toolMode}
          patternZoomLocked={props.state().patternZoomLocked}
          shortcutsEnabled={false}
          onModeChange={props.state().setToolMode}
          onPatternZoomLockedChange={props.state().setPatternZoomLocked}
        />
        <Show when={props.showDownload ?? true}>
          <DemoAlignDownloadButton state={props.state} />
        </Show>
      </div>
    </div>
  );
}