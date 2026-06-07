import type { AlignGridShape, AlignGridState } from "@lisca/contracts";
import { createDefaultAlignGrid, degreesToRadians, radiansToDegrees } from "@lisca/utils";
import { useMemo } from "react";

import { AlignGrid } from "./align-grid";
import type { NavigationOption } from "./frame-navigation";

export function AlignGridRail(props: {
  grid: AlignGridState;
  disabled?: boolean;
  onGridChange: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
}) {
  const shapeOptions = useMemo<NavigationOption<AlignGridShape>[]>(
    () => [
      { label: "Rectangle", value: "rect" },
      { label: "Hexagon", value: "hex" },
    ],
    [],
  );
  const disabled = props.disabled ?? false;
  const updateGrid = (patch: Partial<AlignGridState>) => {
    if (disabled) return;
    props.onGridChange((grid) => ({ ...grid, ...patch }));
  };

  return (
    <AlignGrid
      offsetX={props.grid.tx}
      offsetY={props.grid.ty}
      onOffsetXChange={(tx) => updateGrid({ tx })}
      onOffsetYChange={(ty) => updateGrid({ ty })}
      onOverlayOpacityChange={(opacity) => updateGrid({ opacity })}
      onOverlayVisibleChange={(enabled) => updateGrid({ enabled })}
      onPatternHeightChange={(cellHeight) => updateGrid({ cellHeight })}
      onPatternWidthChange={(cellWidth) => updateGrid({ cellWidth })}
      onReset={() => !disabled && props.onGridChange({ ...createDefaultAlignGrid(), enabled: true })}
      onRotationDegreesChange={(degrees) => updateGrid({ rotation: degreesToRadians(degrees) })}
      onShapeChange={(shape) => updateGrid({ shape })}
      onVectorAChange={(spacingA) => updateGrid({ spacingA })}
      onVectorBChange={(spacingB) => updateGrid({ spacingB })}
      overlayOpacity={props.grid.opacity}
      overlayVisible={props.grid.enabled}
      patternHeight={props.grid.cellHeight}
      patternMin={1}
      patternWidth={props.grid.cellWidth}
      rotationDegrees={radiansToDegrees(props.grid.rotation)}
      sectionClassName="min-h-0 shrink-0"
      shape={props.grid.shape}
      shapeOptions={shapeOptions}
      vectorA={props.grid.spacingA}
      vectorB={props.grid.spacingB}
      vectorMin={1}
    />
  );
}
