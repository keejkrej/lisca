import type { AlignGridState } from "@lisca/contracts";
import { createDefaultAlignGrid, degreesToRadians, radiansToDegrees } from "@lisca/utils";
import { AlignGrid } from "./align-grid";

export function AlignGridRail(props: {
  grid: AlignGridState;
  /** Effective translation shown in Offset X/Y. Defaults to the reference grid. */
  shownTranslation?: { tx: number; ty: number };
  /** False when a pin exists and this acquisition time is only interpolated. */
  translationEditable?: boolean;
  /** Pixel delta from the shown offset. Not applied through `onGridChange`. */
  onTranslationDelta?: (dx: number, dy: number) => void;
  disabled?: boolean;
  sectionAppearance?: "framed" | "rail";
  railPart?: "all" | "grid" | "geometry";
  onGridChange: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
}) {
  const disabled = () => props.disabled ?? false;
  const shownTx = () => props.shownTranslation?.tx ?? props.grid.tx;
  const shownTy = () => props.shownTranslation?.ty ?? props.grid.ty;
  const updateGrid = (patch: Partial<AlignGridState>) => {
    if (disabled()) return;
    props.onGridChange((grid) => ({
      ...grid,
      ...patch,
    }));
  };
  const commitTranslation = (axis: "x" | "y", entered: number) => {
    if (disabled() || props.translationEditable === false) return;
    const delta = entered - (axis === "x" ? shownTx() : shownTy());
    if (props.onTranslationDelta) {
      props.onTranslationDelta(axis === "x" ? delta : 0, axis === "y" ? delta : 0);
      return;
    }
    updateGrid(axis === "x" ? { tx: props.grid.tx + delta } : { ty: props.grid.ty + delta });
  };

  return (
    <AlignGrid
      disabled={disabled()}
      offsetDisabled={disabled() || props.translationEditable === false}
      railPart={props.railPart}
      sectionAppearance={props.sectionAppearance}
      offsetX={shownTx()}
      offsetY={shownTy()}
      onOffsetXChange={(tx) => commitTranslation("x", tx)}
      onOffsetYChange={(ty) => commitTranslation("y", ty)}
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
      onPatternHeightChange={(patternHeight) =>
        updateGrid({
          patternHeight,
        })
      }
      onPatternWidthChange={(patternWidth) =>
        updateGrid({
          patternWidth,
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
      patternHeight={props.grid.patternHeight}
      patternMin={1}
      patternWidth={props.grid.patternWidth}
      rotationDegrees={radiansToDegrees(props.grid.rotation)}
      sectionClassName="min-h-0 shrink-0"
      shape={props.grid.shape}
      spacingA={props.grid.spacingA}
      spacingB={props.grid.spacingB}
      spacingMin={1}
    />
  );
}
