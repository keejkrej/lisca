import type { AlignGridShape } from "@lisca/contracts";

import { DockSection } from "../../shell/regions/dock-section";
import { AlignGridShapeToggle } from "./align-grid-shape-toggle";

export type AlignGridShapeDockSectionProps = {
  shape: AlignGridShape;
  onShapeChange: (shape: AlignGridShape) => void;
  disabled?: boolean;
  sectionTitle?: string;
};

export function AlignGridShapeDockSection(props: AlignGridShapeDockSectionProps) {
  return (
    <DockSection class="min-w-[9.5rem]" title={props.sectionTitle ?? "Grid"}>
      <AlignGridShapeToggle
        disabled={props.disabled}
        shape={props.shape}
        onShapeChange={props.onShapeChange}
      />
    </DockSection>
  );
}
