import { DockStrip } from "@lisca/ui/shell";

import { AlignSaveSection } from "./align-save-section";
import { AlignToolSection } from "./align-tool-section";

export function AlignerDock() {
  return (
    <DockStrip panels={2}>
      <AlignToolSection />
      <AlignSaveSection />
    </DockStrip>
  );
}
