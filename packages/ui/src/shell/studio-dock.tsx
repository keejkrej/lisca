import type { ReactNode } from "react";

import type { DockGridLayout } from "./dock-grid";
import { DockSection } from "./dock-section";
import { DockStrip } from "./dock-strip";

export function StudioDock(props: {
  action?: ReactNode;
  /** When set, action children are placed in a centered {@link DockGrid}. */
  actionLayout?: DockGridLayout;
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
      <DockSection centered={props.actionLayout != null} layout={props.actionLayout} title="Action">
        {props.action}
      </DockSection>
    </DockStrip>
  );
}
