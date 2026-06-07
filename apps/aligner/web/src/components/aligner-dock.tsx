import { AlignSaveSection } from "./align-save-section";
import { AlignToolSection } from "./align-tool-section";

export function AlignerDock() {
  return (
    <div className="flex h-full min-h-0 w-full gap-3 p-3">
      <AlignToolSection />
      <AlignSaveSection />
    </div>
  );
}
