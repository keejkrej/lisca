import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";
import { stemName } from "@lisca/web-demo/browser";
import type { Accessor } from "solid-js";

import { DemoAlignDownloadButton } from "./demo-align-download-button";
import type { DemoAlignState } from "@lisca/web-demo";

export function DemoAlignSaveSection(props: { state: Accessor<DemoAlignState> }) {
  const stem = () => {
    const fileName = props.state().fileName;
    return fileName ? stemName(fileName) : "image";
  };

  return (
    <DockSection title="Save">
      <div class="flex w-full flex-col gap-2">
        <ReadonlyPathField aria-label="Output ROI archive" value={`${stem()}-rois.zip`} />
        <DemoAlignDownloadButton state={props.state} />
      </div>
    </DockSection>
  );
}
