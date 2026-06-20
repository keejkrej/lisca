import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import {
  alignGridOverlayCellRgba,
  alignGridOverlayColors,
  buildAlignGridOverlayScene,
  type AlignGridOverlayCell,
} from "@lisca/utils";
import { Circle, Group, Line, Path, Skia } from "@shopify/react-native-skia";

function buildCellPaths(cells: AlignGridOverlayCell[]) {
  const includedFill = Skia.Path.Make();
  const excludedFill = Skia.Path.Make();
  const includedStroke = Skia.Path.Make();
  const excludedStroke = Skia.Path.Make();
  for (const cell of cells) {
    const rect = Skia.XYWHRect(cell.x, cell.y, cell.w, cell.h);
    if (cell.excluded) {
      excludedFill.addRect(rect);
      excludedStroke.addRect(rect);
    } else {
      includedFill.addRect(rect);
      includedStroke.addRect(rect);
    }
  }
  return { includedFill, excludedFill, includedStroke, excludedStroke };
}

export function AlignGridSkiaOverlay(props: {
  frame: FrameResult;
  grid: AlignGridState;
  viewportWidth: number;
  viewportHeight: number;
  excludedCells?: Iterable<AlignGridCellCoord>;
}) {
  const { frame, grid, viewportWidth, viewportHeight } = props;
  const excludedKeys = new Set(
    Array.from(props.excludedCells ?? [], (cell) => `${cell.i}:${cell.j}`),
  );
  const scene = buildAlignGridOverlayScene(
    frame,
    grid,
    viewportWidth,
    viewportHeight,
    excludedKeys,
  );
  if (!scene) {
    return null;
  }

  const { includedFill, excludedFill, includedStroke, excludedStroke } = buildCellPaths(
    scene.cells,
  );
  const clip = Skia.XYWHRect(
    scene.clipRect.x,
    scene.clipRect.y,
    scene.clipRect.w,
    scene.clipRect.h,
  );

  return (
    <Group>
      <Group clip={clip}>
        <Path
          color={alignGridOverlayCellRgba(false, scene.fillOpacity)}
          path={includedFill}
          style="fill"
        />
        <Path
          color={alignGridOverlayCellRgba(true, scene.fillOpacity)}
          path={excludedFill}
          style="fill"
        />
        <Path
          color={alignGridOverlayCellRgba(false, scene.strokeOpacity)}
          path={includedStroke}
          strokeWidth={1}
          style="stroke"
        />
        <Path
          color={alignGridOverlayCellRgba(true, scene.strokeOpacity)}
          path={excludedStroke}
          strokeWidth={1}
          style="stroke"
        />
      </Group>
      <Circle
        color={alignGridOverlayColors.origin}
        cx={scene.origin.x}
        cy={scene.origin.y}
        r={4}
        strokeWidth={2}
        style="stroke"
      />
      <Line
        color={alignGridOverlayColors.vectorA}
        p1={scene.vectorA.start}
        p2={scene.vectorA.end}
        strokeWidth={2}
      />
      <Line
        color={alignGridOverlayColors.vectorB}
        p1={scene.vectorB.start}
        p2={scene.vectorB.end}
        strokeWidth={2}
      />
    </Group>
  );
}
