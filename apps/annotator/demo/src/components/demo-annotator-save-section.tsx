import { PanelSection, RailControlStack, ReadonlyPathField } from "@lisca/ui/shell";
import { stemName } from "@lisca/web-demo/browser";
import type { Accessor } from "solid-js";

import type { DemoAnnotatorState } from "@lisca/web-demo";
import { DemoAnnotatorDownloadButton } from "./demo-annotator-download-button";

export function DemoAnnotatorSaveSection(props: { state: Accessor<DemoAnnotatorState> }) {
  const stem = () => {
    const fileName = props.state().fileName;
    return fileName ? stemName(fileName) : "image";
  };

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <ReadonlyPathField
          aria-label="Output annotation archive"
          value={`${stem()}-annotation.zip`}
        />
        <DemoAnnotatorDownloadButton state={props.state} />
      </RailControlStack>
    </PanelSection>
  );
}
