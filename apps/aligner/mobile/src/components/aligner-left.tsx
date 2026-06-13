import { ContrastControl, SidebarStack } from "@lisca/ui-native";

import type { AlignState } from "../state/use-align-state";
import { AlignFrameNavigation } from "./align-frame-navigation";

export function AlignerLeft(props: { alignState: AlignState }) {
  return (
    <SidebarStack>
      <AlignFrameNavigation state={props.alignState} />
      <ContrastControl
        contrast={props.alignState.contrast}
        disabled={!props.alignState.frame || props.alignState.cropping}
        frame={props.alignState.frame}
        sectionStyle={{ flexShrink: 0 }}
        onContrastChange={props.alignState.setContrast}
      />
    </SidebarStack>
  );
}
