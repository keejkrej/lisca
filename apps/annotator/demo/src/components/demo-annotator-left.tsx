import { AnnotatorContrastRail } from "@lisca/ui/features";

import type { DemoAnnotatorState } from "../state/use-demo-annotator-state";

export function DemoAnnotatorLeft({ state }: { state: DemoAnnotatorState }) {
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <AnnotatorContrastRail
        contrast={state.contrast}
        disabled={!state.frame}
        frame={state.frame}
        onContrastChange={state.setContrast}
      />
    </div>
  );
}
