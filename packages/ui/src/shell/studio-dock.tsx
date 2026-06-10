import type { ReactNode } from "react";

import type { DockGridLayout } from "./dock-grid";
import { dockSingleButtonClass, DockSection } from "./dock-section";
import { DockStrip } from "./dock-strip";

export function StudioDock(props: {
  action?: ReactNode;
  /** When set, action children are placed in a centered {@link DockGrid}. */
  actionLayout?: DockGridLayout;
  instruction?: string;
  tool?: ReactNode;
  /** When set, tool children are placed in a centered {@link DockGrid}. */
  toolLayout?: DockGridLayout;
}) {
  return (
    <DockStrip panels={props.tool ? 3 : 2}>
      <DockSection title="Instruction">
        {props.instruction ? (
          <p className="line-clamp-4 text-center text-sm leading-snug">{props.instruction}</p>
        ) : null}
      </DockSection>
      {props.tool ? (
        <DockSection layout={props.toolLayout} title="Tool">
          {props.tool}
        </DockSection>
      ) : null}
      <DockSection
        contentClassName={props.actionLayout == null ? "items-center" : undefined}
        layout={props.actionLayout}
        title="Action"
      >
        {props.actionLayout == null ? (
          <div className={dockSingleButtonClass}>{props.action}</div>
        ) : (
          props.action
        )}
      </DockSection>
    </DockStrip>
  );
}
