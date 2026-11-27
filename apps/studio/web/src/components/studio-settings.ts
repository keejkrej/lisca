import type { Html } from "@effect/ui/html";
import { InferenceSettingsPanel } from "@lisca/instrument";
import { ShellSettingsDialog } from "@lisca/ui/shell";

export type StudioSettingsOptions = {
  readonly key?: string | undefined;
};

/** Studio settings: updates, label-free inference, and local agent access. */
export function StudioSettings<M>(h: Html.H<M>, options?: StudioSettingsOptions) {
  return ShellSettingsDialog(h, {
    key: options?.key ?? "studio-settings",
    inferenceSlot: InferenceSettingsPanel(h, {
      key: "studio-inference-settings",
      props: {},
    }),
    productName: "Studio",
    triggerVariant: "outline",
  });
}
