import type { Html } from "@effect/ui/html";
import type { ContrastWindow } from "@lisca/contracts";
import { ContrastControl, RoiFrameNavigation, type RoiFrameSelection } from "@lisca/instrument";

import type { StudioAnnotateNavSnapshot } from "../state/studio-annotate-page-selectors";

export type StudioAnnotateNavOptions<M> = {
  readonly nav: StudioAnnotateNavSnapshot;
  readonly standard?: boolean | undefined;
  readonly onSelectionChange: (patch: Partial<RoiFrameSelection>) => M;
  readonly onContrastChange: (
    contrast: ContrastWindow | null,
    meta?: { readonly lock?: boolean },
  ) => M;
  readonly onContrastLockedChange: (locked: boolean) => M;
};

export function StudioAnnotateNav<M>(h: Html.H<M>, options: StudioAnnotateNavOptions<M>) {
  const { nav, standard } = options;

  return [
    RoiFrameNavigation(h, {
      key: standard ? "annotate-nav-standard" : "annotate-nav-expert",
      standard,
      position: nav.position,
      scan: nav.scan,
      sectionAppearance: "rail",
      selection: nav.selection,
      onSelectionChange: options.onSelectionChange,
    }),
    ContrastControl(h, {
      key: standard ? "annotate-contrast-standard" : "annotate-contrast-expert",
      ariaLabel: "Contrast",
      contrast: nav.contrast,
      contrastLocked: nav.contrastLocked,
      disabled: !nav.frame,
      frame: nav.frame,
      role: "region",
      sectionAppearance: "rail",
      sectionClassName: "min-h-0 shrink-0",
      sectionContentClassName: "flex min-h-0 flex-col",
      onContrastChange: options.onContrastChange,
      onContrastLockedChange: options.onContrastLockedChange,
    }),
  ];
}
