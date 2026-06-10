import { DockStrip } from "@lisca/ui/shell";

import { AlignSaveSection } from "./align-save-section";
import { AlignToolSectionPanel } from "./align-tool-section";

export function AlignerDock() {
  return (
    <DockStrip panels={2}>
      <AlignToolSectionPanel />
      <AlignSaveSection />
    </DockStrip>
  );
}
