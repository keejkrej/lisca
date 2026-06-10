import {
  AlignGridShapeDockSection,
  AlignGridShapeToggle,
  AlignToolSection,
  AlignToolToolbar,
} from "@lisca/ui/features";
import { DockSection, DockStrip } from "@lisca/ui/shell";

import { DemoAlignDownloadButton } from "./demo-align-download-button";
import type { DemoAlignState } from "../state/use-demo-align-state";

function DemoAlignShapeDockSection({ state }: { state: DemoAlignState }) {
  return (
    <AlignGridShapeDockSection
      disabled={!state.frame}
      shape={state.grid.shape}
      onShapeChange={(shape) =>
        state.setGrid((grid) => ({
          ...grid,
          shape,
        }))
      }
    />
  );
}

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
      <DemoAlignShapeDockSection state={state} />
      <DemoAlignToolSection state={state} />
      <DockSection title="Save">
        <DemoAlignDownloadButton state={state} />
      </DockSection>
    </DockStrip>
  );
}

export function DemoInlineAlignDock({ state }: { state: DemoAlignState }) {
  return <DemoAlignDock state={state} />;
}

/** Stacked controls when the viewport is too narrow for {@link DemoInlineAlignDock}. */
export function DemoInlineAlignToolbar({ state }: { state: DemoAlignState }) {
  return (
    <div className="shrink-0 border-t border-border px-3 py-2">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
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
        <AlignToolToolbar
          mode={state.toolMode}
          patternZoomLocked={state.patternZoomLocked}
          onModeChange={state.setToolMode}
          onPatternZoomLockedChange={state.setPatternZoomLocked}
        />
        <DemoAlignDownloadButton state={state} />
      </div>
    </div>
  );
}
