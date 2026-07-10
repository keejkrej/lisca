import type { AlignGridState } from "@lisca/contracts";
import { createDefaultAlignGrid, degreesToRadians, radiansToDegrees } from "@lisca/utils";
import { AlignGrid } from "./align-grid";

export function AlignGridRail(props: {
  grid: AlignGridState;
  disabled?: boolean;
  onGridChange: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
}) {
  const disabled = () => props.disabled ?? false;
  const updateGrid = (patch: Partial<AlignGridState>) => {
    if (disabled()) return;
    props.onGridChange((grid) => ({
      ...grid,
      ...patch,
    }));
  };

  return (
    <AlignGrid
      offsetX={props.grid.tx}
      offsetY={props.grid.ty}
      onOffsetXChange={(tx) =>
        updateGrid({
          tx,
        })
      }
      onOffsetYChange={(ty) =>
        updateGrid({
          ty,
        })
      }
      onOverlayOpacityChange={(opacity) =>
        updateGrid({
          opacity,
        })
      }
      onOverlayVisibleChange={(enabled) =>
        updateGrid({
          enabled,
        })
      }
      onPatternHeightChange={(cellHeight) =>
        updateGrid({
          cellHeight,
        })
      }
      onPatternWidthChange={(cellWidth) =>
        updateGrid({
          cellWidth,
        })
      }
      onReset={() =>
        !disabled() &&
        props.onGridChange({
          ...createDefaultAlignGrid(),
          enabled: true,
        })
      }
      onRotationDegreesChange={(degrees) =>
        updateGrid({
          rotation: degreesToRadians(degrees),
        })
      }
      onShapeChange={(shape) =>
        updateGrid({
          shape,
        })
      }
      onSpacingAChange={(spacingA) =>
        updateGrid({
          spacingA,
        })
      }
      onSpacingBChange={(spacingB) =>
        updateGrid({
          spacingB,
        })
      }
      overlayOpacity={props.grid.opacity}
      overlayVisible={props.grid.enabled}
      patternHeight={props.grid.cellHeight}
      patternMin={1}
      patternWidth={props.grid.cellWidth}
      rotationDegrees={radiansToDegrees(props.grid.rotation)}
      sectionClassName="min-h-0 shrink-0"
      shape={props.grid.shape}
      spacingA={props.grid.spacingA}
      spacingB={props.grid.spacingB}
      spacingMin={1}
    />
  );
}