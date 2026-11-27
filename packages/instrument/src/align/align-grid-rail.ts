import type { Html } from "@effect/ui/html";
import type { AlignGridShape, AlignGridState } from "@lisca/contracts";
import { createDefaultAlignGrid, degreesToRadians, radiansToDegrees } from "@lisca/utils";

import { AlignGrid } from "./align-grid";

export type AlignGridRailOptions<M> = {
  readonly key?: string | undefined;
  readonly grid: AlignGridState;
  /** Effective translation shown in Offset X/Y. Defaults to the reference grid. */
  readonly shownTranslation?: { readonly tx: number; readonly ty: number } | undefined;
  /** False when a pin exists and this acquisition time is only interpolated. */
  readonly translationEditable?: boolean | undefined;
  /** Pixel delta from the shown offset. Not applied through `onGridChange`. */
  readonly onTranslationDelta?: ((dx: number, dy: number) => M | undefined) | undefined;
  readonly disabled?: boolean | undefined;
  readonly sectionAppearance?: "framed" | "rail" | undefined;
  readonly railPart?: "all" | "grid" | "geometry" | undefined;
  readonly detecting?: boolean | undefined;
  readonly detectReport?: string | null | undefined;
  readonly detectLowConfidence?: boolean | undefined;
  readonly onDetectGrid?: ((shape?: AlignGridShape) => M | undefined) | undefined;
  readonly onGridChange: (next: AlignGridState) => M | undefined;
};

export type AlignGridRailProps<M = never> = AlignGridRailOptions<M>;

export function AlignGridRail<M>(h: Html.H<M>, options: AlignGridRailOptions<M>) {
  const disabled = options.disabled ?? false;
  const shownTx = options.shownTranslation?.tx ?? options.grid.tx;
  const shownTy = options.shownTranslation?.ty ?? options.grid.ty;

  const updateGrid = (patch: Partial<AlignGridState>): M | undefined => {
    if (disabled) return undefined;
    return options.onGridChange({
      ...options.grid,
      ...patch,
    });
  };

  const commitTranslation = (axis: "x" | "y", entered: number): M | undefined => {
    if (disabled || options.translationEditable === false) return undefined;
    const delta = entered - (axis === "x" ? shownTx : shownTy);
    if (options.onTranslationDelta) {
      return options.onTranslationDelta(axis === "x" ? delta : 0, axis === "y" ? delta : 0);
    }
    return updateGrid(
      axis === "x" ? { tx: options.grid.tx + delta } : { ty: options.grid.ty + delta },
    );
  };

  const resetMessage = !disabled
    ? options.onGridChange({
        ...createDefaultAlignGrid(),
        enabled: true,
      })
    : undefined;

  return AlignGrid(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    disabled,
    offsetDisabled: disabled || options.translationEditable === false,
    railPart: options.railPart,
    sectionAppearance: options.sectionAppearance,
    offsetX: shownTx,
    offsetY: shownTy,
    onOffsetXChange: (tx) => commitTranslation("x", tx),
    onOffsetYChange: (ty) => commitTranslation("y", ty),
    onOverlayOpacityChange: (opacity) => updateGrid({ opacity }),
    onOverlayVisibleChange: (enabled) => updateGrid({ enabled }),
    onPatternHeightChange: (patternHeight) => updateGrid({ patternHeight }),
    onPatternWidthChange: (patternWidth) => updateGrid({ patternWidth }),
    onReset: resetMessage,
    onRotationDegreesChange: (degrees) => updateGrid({ rotation: degreesToRadians(degrees) }),
    onShapeChange: (shape) => updateGrid({ shape }),
    onSpacingAChange: (spacingA) => updateGrid({ spacingA }),
    onSpacingBChange: (spacingB) => updateGrid({ spacingB }),
    detectLowConfidence: options.detectLowConfidence,
    detectReport: options.detectReport,
    detecting: options.detecting,
    overlayOpacity: options.grid.opacity,
    overlayVisible: options.grid.enabled,
    onDetectGrid: options.onDetectGrid,
    patternHeight: options.grid.patternHeight,
    patternMin: 1,
    patternWidth: options.grid.patternWidth,
    rotationDegrees: radiansToDegrees(options.grid.rotation),
    sectionClassName: "min-h-0 shrink-0",
    shape: options.grid.shape,
    spacingA: options.grid.spacingA,
    spacingB: options.grid.spacingB,
    spacingMin: 1,
  });
}
