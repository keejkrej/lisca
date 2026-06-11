import {
  AlignGridShapeToggle,
  AlignToolSection,
  AlignToolToolbar,
} from "@lisca/ui/features";
import { DockStrip } from "@lisca/ui/shell";

import { DemoAlignDownloadButton } from "./demo-align-download-button";
import { DemoAlignSaveSection } from "./demo-align-save-section";
import type { DemoAlignState } from "@lisca/web-demo";

export function DemoAlignToolSection({ state }: { state: DemoAlignState }) {
  return (
    <AlignToolSection
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      onModeChange={state.setToolMode}
      onPatternZoomLockedChange={state.setPatternZoomLocked}
    />
  );
}

export function DemoAlignDock({ state }: { state: DemoAlignState }) {
  return (
    <DockStrip>
      <DemoAlignToolSection state={state} />
      <DemoAlignSaveSection state={state} />
    </DockStrip>
  );
}

/** Compact toolbar for embedded landing previews and narrow viewports. */
export function DemoInlineAlignToolbar({
  state,
  showShapeToggle = true,
  showDownload = true,
}: {
  state: DemoAlignState;
  showShapeToggle?: boolean;
  showDownload?: boolean;
}) {
  return (
    <div className="shrink-0 border-t border-border px-3 py-2">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
        {showShapeToggle ? (
          <AlignGridShapeToggle
            disabled={!state.frame}
            shape={state.grid.shape}
            onShapeChange={(shape) =>
              state.setGrid((grid) => ({
                ...grid,
                shape,
              }))
            }
          />
        ) : null}
        <AlignToolToolbar
          mode={state.toolMode}
          patternZoomLocked={state.patternZoomLocked}
          shortcutsEnabled={false}
          onModeChange={state.setToolMode}
          onPatternZoomLockedChange={state.setPatternZoomLocked}
        />
        {showDownload ? <DemoAlignDownloadButton state={state} /> : null}
      </div>
    </div>
  );
}
