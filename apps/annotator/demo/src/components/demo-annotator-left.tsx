import { ContrastControl } from "@lisca/ui";

import type { DemoAnnotatorState } from "../state/use-demo-annotator-state";

export function DemoAnnotatorLeft({ state }: { state: DemoAnnotatorState }) {
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <ContrastControl
        autoRangeDisabled={!state.frame}
        disabled={!state.frame}
        domainMax={state.contrastDomain.max}
        domainMin={state.contrastDomain.min}
        maxValue={state.contrastMax}
        minValue={state.contrastMin}
        onAutoRange={() =>
          state.setContrast({ min: state.contrastDomain.min, max: state.contrastDomain.max })
        }
        onMaxCommit={(max) => state.setContrast({ min: state.contrastMin, max })}
        onMinCommit={(min) => state.setContrast({ min, max: state.contrastMax })}
      />
    </div>
  );
}
