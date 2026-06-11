import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";
import { stemName } from "@lisca/web-demo/browser";

import { DemoAlignDownloadButton } from "./demo-align-download-button";
import type { DemoAlignState } from "@lisca/web-demo";

export function DemoAlignSaveSection({ state }: { state: DemoAlignState }) {
  const stem = state.fileName ? stemName(state.fileName) : "image";

  return (
    <DockSection title="Save">
      <div className="flex w-full flex-col gap-2">
        <ReadonlyPathField aria-label="Output ROI archive" value={`${stem}-rois.zip`} />
        <DemoAlignDownloadButton state={state} />
      </div>
    </DockSection>
  );
}
