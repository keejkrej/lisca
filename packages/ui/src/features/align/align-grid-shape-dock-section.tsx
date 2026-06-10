"use client";

import type { AlignGridShape } from "@lisca/contracts";

import { DockSection } from "../../shell/regions/dock-section";
import { AlignGridShapeToggle } from "./align-grid-shape-toggle";

export type AlignGridShapeDockSectionProps = {
  shape: AlignGridShape;
  onShapeChange: (shape: AlignGridShape) => void;
  disabled?: boolean;
  sectionTitle?: string;
};

export function AlignGridShapeDockSection({
  shape,
  onShapeChange,
  disabled,
  sectionTitle = "Grid",
}: AlignGridShapeDockSectionProps) {
  return (
    <DockSection className="min-w-[9.5rem]" title={sectionTitle}>
      <AlignGridShapeToggle disabled={disabled} shape={shape} onShapeChange={onShapeChange} />
    </DockSection>
  );
}
