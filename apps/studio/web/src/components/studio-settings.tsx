import { InferenceSettingsPanel } from "@lisca/instrument";
import { ShellSettingsDialog } from "@lisca/ui/shell";

import { studioLabelFreeClient } from "./label-free-references";

/** Studio settings: updates, label-free inference, and local agent access. */
export function StudioSettings() {
  return (
    <ShellSettingsDialog
      inferenceSlot={<InferenceSettingsPanel client={studioLabelFreeClient} />}
      productName="Studio"
      triggerVariant="outline"
    />
  );
}
