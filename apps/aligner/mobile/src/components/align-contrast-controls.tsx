import { ContrastControl } from "@lisca/ui-native";

import type { AlignState } from "../state/use-align-state";

export function AlignContrastControls({ state }: { state: AlignState }) {
  const domain = state.frame?.contrastDomain ?? { min: 0, max: 255 };
  const value = state.contrast ?? { min: domain.min, max: domain.max };
  const suggestedContrast = state.frame?.suggestedContrast ??
    state.frame?.appliedContrast ?? { min: domain.min, max: domain.max };
  return (
    <ContrastControl
      disabled={!state.frame || state.cropping}
      domainMax={domain.max}
      domainMin={domain.min}
      maxValue={value.max}
      minValue={value.min}
      onAutoRange={() => state.setContrast(suggestedContrast)}
      onMaxCommit={(max) => state.setContrast({ min: value.min, max })}
      onMinCommit={(min) => state.setContrast({ min, max: value.max })}
    />
  );
}
