import { AlignToolSection, AlignToolToolbar } from "@lisca/ui/features";

import type { DemoAlignState } from "../state/use-demo-align-state";

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

export function DemoInlineAlignToolbar({ state }: { state: DemoAlignState }) {
  return (
    <div className="shrink-0 border-t border-border px-3 py-2 [&>div]:mx-auto [&>div]:max-w-lg">
      <AlignToolToolbar
        mode={state.toolMode}
        patternZoomLocked={state.patternZoomLocked}
        onModeChange={state.setToolMode}
        onPatternZoomLockedChange={state.setPatternZoomLocked}
      />
    </div>
  );
}
