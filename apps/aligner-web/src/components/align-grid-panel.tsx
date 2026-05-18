import type { AlignGridShape, AlignGridState } from "@lisca/contracts";
import { AlignGrid, type NavigationOption } from "@lisca/ui";
import { createDefaultAlignGrid, degreesToRadians, radiansToDegrees } from "@lisca/utils";
import { useMemo } from "react";

import type { AlignState } from "../state/use-align-state";

export function AlignGridPanel({ state }: { state: AlignState }) {
  const shapeOptions = useMemo<NavigationOption<AlignGridShape>[]>(
    () => [
      { label: "Rectangle", value: "rect" },
      { label: "Hexagon", value: "hex" },
    ],
    [],
  );
  const disabled = state.cropping || !state.frame;
  const updateGrid = (patch: Partial<AlignGridState>) => {
    if (disabled) return;
    state.setGrid((grid) => ({ ...grid, ...patch }));
  };

  return (
    <AlignGrid
      patternHeight={state.grid.cellHeight}
      patternMin={1}
      patternWidth={state.grid.cellWidth}
      offsetX={state.grid.tx}
      offsetY={state.grid.ty}
      onPatternHeightChange={(cellHeight) => updateGrid({ cellHeight })}
      onPatternWidthChange={(cellWidth) => updateGrid({ cellWidth })}
      onOffsetXChange={(tx) => updateGrid({ tx })}
      onOffsetYChange={(ty) => updateGrid({ ty })}
      onOverlayOpacityChange={(opacity) => updateGrid({ opacity })}
      onOverlayVisibleChange={(enabled) => updateGrid({ enabled })}
      onVectorAChange={(spacingA) => updateGrid({ spacingA })}
      onVectorBChange={(spacingB) => updateGrid({ spacingB })}
      onReset={() => !disabled && state.setGrid({ ...createDefaultAlignGrid(), enabled: true })}
      onRotationDegreesChange={(degrees) => updateGrid({ rotation: degreesToRadians(degrees) })}
      onShapeChange={(shape) => updateGrid({ shape })}
      overlayOpacity={state.grid.opacity}
      overlayVisible={state.grid.enabled}
      vectorA={state.grid.spacingA}
      vectorB={state.grid.spacingB}
      vectorMin={1}
      rotationDegrees={radiansToDegrees(state.grid.rotation)}
      shape={state.grid.shape}
      shapeOptions={shapeOptions}
      sectionClassName="min-h-0 shrink-0"
    />
  );
}
