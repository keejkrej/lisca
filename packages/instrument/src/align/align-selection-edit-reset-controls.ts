import type { Html } from "@effect/ui/html";
import { Button } from "@lisca/ui/button";

import { AlignEditToggle } from "./align-edit-toggle";

export type AlignSelectionEditResetControlsOptions<M> = {
  readonly disabled?: boolean | undefined;
  readonly manualExclusionEnabled: boolean;
  readonly onManualExclusionEnabledChange: (enabled: boolean) => M | undefined;
  readonly onReset: M;
  readonly resetDisabled?: boolean | undefined;
};

export type AlignSelectionEditResetControlsProps<M = never> =
  AlignSelectionEditResetControlsOptions<M>;

export function AlignSelectionEditResetControls<M>(
  h: Html.H<M>,
  options: AlignSelectionEditResetControlsOptions<M>,
) {
  const disabled = options.disabled ?? false;
  const resetDisabled = options.resetDisabled ?? disabled;

  return h.div.class("grid w-full grid-cols-2 gap-2").children(
    AlignEditToggle(h, {
      disabled,
      enabled: options.manualExclusionEnabled,
      onEnabledChange: options.onManualExclusionEnabledChange,
    }),
    Button(h, {
      class: "w-full justify-center text-xs",
      disabled: resetDisabled,
      size: "sm",
      type: "button",
      variant: "outline",
      onPress: options.onReset,
    }).children("Reset"),
  );
}
