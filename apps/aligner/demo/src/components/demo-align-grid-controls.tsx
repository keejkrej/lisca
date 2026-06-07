import type { AlignGridShape, AlignGridState } from "@lisca/contracts";
import { AlignGrid, type NavigationOption } from "@lisca/ui";
import { createDefaultAlignGrid, degreesToRadians, radiansToDegrees } from "@lisca/utils";
import { useMemo } from "react";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignGridControls({ state }: { state: DemoAlignState }) {
  const shapeOptions = useMemo<NavigationOption<AlignGridShape>[]>(
    () => [
      { label: "Rectangle", value: "rect" },
      { label: "Hexagon", value: "hex" },
    ],
    [],
  );
  const disabled = !state.frame;
  const updateGrid = (patch: Partial<AlignGridState>) => {
    if (disabled) return;
    state.setGrid((grid) => ({ ...grid, ...patch }));
  };

  return (
    <AlignGrid
      offsetX={state.grid.tx}
      offsetY={state.grid.ty}
      onOffsetXChange={(tx) => updateGrid({ tx })}
      onOffsetYChange={(ty) => updateGrid({ ty })}
      onOverlayOpacityChange={(opacity) => updateGrid({ opacity })}
      onOverlayVisibleChange={(enabled) => updateGrid({ enabled })}
      onPatternHeightChange={(cellHeight) => updateGrid({ cellHeight })}
      onPatternWidthChange={(cellWidth) => updateGrid({ cellWidth })}
      onReset={() => !disabled && state.setGrid({ ...createDefaultAlignGrid(), enabled: true })}
      onRotationDegreesChange={(degrees) => updateGrid({ rotation: degreesToRadians(degrees) })}
      onShapeChange={(shape) => updateGrid({ shape })}
      onVectorAChange={(spacingA) => updateGrid({ spacingA })}
      onVectorBChange={(spacingB) => updateGrid({ spacingB })}
      overlayOpacity={state.grid.opacity}
      overlayVisible={state.grid.enabled}
      patternHeight={state.grid.cellHeight}
      patternMin={1}
      patternWidth={state.grid.cellWidth}
      rotationDegrees={radiansToDegrees(state.grid.rotation)}
      sectionClassName="min-h-0 shrink-0"
      shape={state.grid.shape}
      shapeOptions={shapeOptions}
      vectorA={state.grid.spacingA}
      vectorB={state.grid.spacingB}
      vectorMin={1}
    />
  );
}
