import type { ReactNode } from "react";

import { DockSection } from "./dock-section";
import { DockStrip } from "./dock-strip";

export function StudioDock(props: {
  action?: ReactNode;
  instruction?: string;
  tool?: ReactNode;
}) {
  return (
    <DockStrip panels={props.tool ? 3 : 2}>
      <DockSection title="Instruction">
        {props.instruction ? (
          <p className="line-clamp-4 text-center text-sm leading-snug">{props.instruction}</p>
        ) : null}
      </DockSection>
      {props.tool ? <DockSection title="Tool">{props.tool}</DockSection> : null}
      <DockSection title="Action">{props.action}</DockSection>
    </DockStrip>
  );
}
