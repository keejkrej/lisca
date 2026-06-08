import { dockLayout2Class } from "@lisca/ui/shell";

import { AlignSaveSection } from "./align-save-section";
import { AlignToolSection } from "./align-tool-section";

export function AlignerDock() {
  return (
    <div className={dockLayout2Class}>
      <AlignToolSection />
      <AlignSaveSection />
    </div>
  );
}
