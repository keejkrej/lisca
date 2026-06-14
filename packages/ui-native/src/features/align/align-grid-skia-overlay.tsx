import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { enumerateVisibleAlignGridCells } from "@lisca/utils";
import type { FrameLayout } from "@lisca/utils";
import { Group, Path, Rect, Skia } from "@shopify/react-native-skia";

function buildAlignGridPaths(
  frame: FrameResult,
  grid: AlignGridState,
  frameLayout: FrameLayout,
  excludedKeys: ReadonlySet<string>,
) {
  const included = Skia.Path.Make();
  const excluded = Skia.Path.Make();
  for (const cell of enumerateVisibleAlignGridCells(frame, grid)) {
    const x = frameLayout.drawX + cell.x * frameLayout.scale;
    const y = frameLayout.drawY + cell.y * frameLayout.scale;
    const w = cell.w * frameLayout.scale;
    const h = cell.h * frameLayout.scale;
    const rect = Skia.XYWHRect(x, y, w, h);
    if (excludedKeys.has(`${cell.i}:${cell.j}`)) {
      excluded.addRect(rect);
    } else {
      included.addRect(rect);
    }
  }
  return { included, excluded };
}

export function AlignGridSkiaOverlay(props: {
  frame: FrameResult;
  grid: AlignGridState;
  frameLayout: FrameLayout;
  excludedCells?: Iterable<AlignGridCellCoord>;
}) {
  const { frame, grid, frameLayout } = props;
  if (!grid.enabled) {
    return null;
  }

  const excludedKeys = new Set(
    Array.from(props.excludedCells ?? [], (cell) => `${cell.i}:${cell.j}`),
  );
  const { included, excluded } = buildAlignGridPaths(frame, grid, frameLayout, excludedKeys);
  const originX = frameLayout.drawX + (frame.width / 2 + grid.tx) * frameLayout.scale;
  const originY = frameLayout.drawY + (frame.height / 2 + grid.ty) * frameLayout.scale;
  const opacity = grid.opacity * 0.55;

  return (
    <Group>
      <Path color={`rgba(68, 151, 255, ${opacity})`} path={included} style="fill" />
      <Path color={`rgba(244, 63, 94, ${opacity})`} path={excluded} style="fill" />
      <Rect color="white" height={8} width={8} x={originX - 4} y={originY - 4} />
    </Group>
  );
}
