import { AlignToolSection, DockStrip } from "@lisca/ui-native";

import type { AlignState } from "../state/use-align-state";
import { AlignSaveSection } from "./align-save-section";

export function AlignerDock(props: { alignState: AlignState }) {
  const { alignState: state } = props;

  return (
    <DockStrip>
      <AlignToolSection
        mode={state.toolMode}
        patternZoomLocked={state.patternZoomLocked}
        onModeChange={(mode) => {
          if (!state.cropping) state.setToolMode(mode);
        }}
        onPatternZoomLockedChange={(locked) => {
          if (!state.cropping) state.setPatternZoomLocked(locked);
        }}
      />
      <AlignSaveSection state={state} />
    </DockStrip>
  );
}
