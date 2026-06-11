import { BOXPLOT_STROKE } from "@lisca/analysis/charts";
import { Line as SkiaLine, Rect as SkiaRect } from "@shopify/react-native-skia";
import type { PointsArray } from "victory-native";
import { pointY } from "./use-chart-font";

export function BoxPlotMarks(props: {
  groups: Array<{ label: string }>;
  points: Record<string, PointsArray>;
  color?: string;
}) {
  const color = props.color ?? BOXPLOT_STROKE;
  const q1Points = props.points.q1 ?? [];
  const q3Points = props.points.q3 ?? [];
  const medianPoints = props.points.median ?? [];
  const minPoints = props.points.min ?? [];
  const maxPoints = props.points.max ?? [];

  return (
    <>
      {props.groups.map((group, index) => {
        const q1 = q1Points[index];
        const q3 = q3Points[index];
        const median = medianPoints[index];
        const min = minPoints[index];
        const max = maxPoints[index];
        if (
          !q1 ||
          !q3 ||
          !median ||
          !min ||
          !max ||
          !pointY(q1.y) ||
          !pointY(q3.y) ||
          !pointY(median.y) ||
          !pointY(min.y) ||
          !pointY(max.y)
        ) {
          return null;
        }
        const boxWidth = 24;
        const q1Y = q1.y;
        const q3Y = q3.y;
        const medianY = median.y;
        const minY = min.y;
        const maxY = max.y;
        return (
          <>
            <SkiaRect
              key={`${group.label}-box`}
              color={color}
              height={Math.max(1, q1Y - q3Y)}
              opacity={0.35}
              width={boxWidth}
              x={q1.x - boxWidth / 2}
              y={q3Y}
            />
            <SkiaLine
              key={`${group.label}-median`}
              color={color}
              p1={{ x: q1.x - boxWidth / 2, y: medianY }}
              p2={{ x: q1.x + boxWidth / 2, y: medianY }}
              strokeWidth={2}
            />
            <SkiaLine
              key={`${group.label}-lower`}
              color={color}
              p1={{ x: q1.x, y: minY }}
              p2={{ x: q1.x, y: q3Y }}
              strokeWidth={1}
            />
            <SkiaLine
              key={`${group.label}-upper`}
              color={color}
              p1={{ x: q1.x, y: q1Y }}
              p2={{ x: q1.x, y: maxY }}
              strokeWidth={1}
            />
          </>
        );
      })}
    </>
  );
}
