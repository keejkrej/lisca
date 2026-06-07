import { ContrastControl } from "@lisca/ui";

import type { AlignState } from "../state/use-align-state";

export function AlignContrastControls({ state }: { state: AlignState }) {
  const domain = state.frame?.contrastDomain ?? { min: 0, max: 255 };
  const value = state.contrast ??
    state.frame?.appliedContrast ?? { min: domain.min, max: domain.max };
  return (
    <ContrastControl
      aria-label="Contrast"
      autoRangeDisabled={!state.frame || state.cropping}
      disabled={!state.frame || state.cropping}
      domainMax={domain.max}
      domainMin={domain.min}
      maxValue={value.max}
      minValue={value.min}
      role="region"
      sectionClassName="min-h-0 shrink-0"
      sectionContentClassName="flex min-h-0 flex-col overflow-auto"
      onAutoRange={() => state.setContrast(null)}
      onMaxCommit={(max) => state.setContrast({ min: value.min, max })}
      onMinCommit={(min) => state.setContrast({ min, max: value.max })}
    />
  );
}
