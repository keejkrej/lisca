import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";
import { stemName } from "@lisca/web-demo/browser";

import type { DemoAnnotatorState } from "../state/use-demo-annotator-state";
import { DemoAnnotatorDownloadButton } from "./demo-annotator-download-button";

export function DemoAnnotatorSaveSection({ state }: { state: DemoAnnotatorState }) {
  const stem = state.fileName ? stemName(state.fileName) : "image";

  return (
    <DockSection title="Save">
      <div className="flex w-full flex-col gap-2">
        <ReadonlyPathField aria-label="Output annotation archive" value={`${stem}-annotation.zip`} />
        <DemoAnnotatorDownloadButton state={state} />
      </div>
    </DockSection>
  );
}
