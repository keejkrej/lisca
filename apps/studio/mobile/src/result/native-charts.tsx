import type { ResultPanel, TimeseriesPanel, BoxPlotPanel } from "@lisca/studio-result";
import Svg, { Polyline, Rect, Text as SvgText } from "react-native-svg";
import { View } from "react-native";

const TRACE_PALETTE = ["#60a5fa", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];

export function ResultPanelChart(props: { panel: ResultPanel; width: number; height: number }) {
  if (props.panel.kind === "timeseries") {
    return <TimeseriesChart panel={props.panel} width={props.width} height={props.height} />;
  }
  if (props.panel.kind === "boxplot") {
    return <BoxPlotChart panel={props.panel} width={props.width} height={props.height} />;
  }
  return null;
}

function TimeseriesChart(props: { panel: TimeseriesPanel; width: number; height: number }) {
  const padding = 32;
  const plotWidth = props.width - padding * 2;
  const plotHeight = props.height - padding * 2;
  const allPoints = props.panel.traces.flatMap((trace) => trace.points);
  const minX = Math.min(...allPoints.map((p) => p.x), 0);
  const maxX = Math.max(...allPoints.map((p) => p.x), 1);
  const minY = Math.min(...allPoints.map((p) => p.y), 0);
  const maxY = Math.max(...allPoints.map((p) => p.y), 1);
  const sx = (x: number) => padding + ((x - minX) / Math.max(1, maxX - minX)) * plotWidth;
  const sy = (y: number) => padding + plotHeight - ((y - minY) / Math.max(1, maxY - minY)) * plotHeight;

  return (
    <View>
      <Svg width={props.width} height={props.height}>
        <SvgText x={padding} y={16} fill="#fafafa" fontSize={12}>
          {props.panel.title}
        </SvgText>
        {props.panel.traces.map((trace, index) => (
          <Polyline
            key={trace.key}
            points={trace.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")}
            fill="none"
            stroke={TRACE_PALETTE[index % TRACE_PALETTE.length]}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  );
}

function BoxPlotChart(props: { panel: BoxPlotPanel; width: number; height: number }) {
  const padding = 32;
  const groupWidth = (props.width - padding * 2) / Math.max(1, props.panel.groups.length);
  const allValues = props.panel.groups.flatMap((group) => group.values);
  const minY = Math.min(...allValues, 0);
  const maxY = Math.max(...allValues, 1);
  const sy = (y: number) =>
    padding +
    (props.height - padding * 2) -
    ((y - minY) / Math.max(1, maxY - minY)) * (props.height - padding * 2);

  return (
    <Svg width={props.width} height={props.height}>
      <SvgText x={padding} y={16} fill="#fafafa" fontSize={12}>
        {props.panel.title}
      </SvgText>
      {props.panel.groups.map((group, index) => {
        const x = padding + index * groupWidth + groupWidth / 2;
        const stats = group.stats;
        return (
          <Rect
            key={group.label}
            x={x - 12}
            y={sy(stats.q3)}
            width={24}
            height={Math.max(1, sy(stats.q1) - sy(stats.q3))}
            fill="#60a5fa"
          />
        );
      })}
    </Svg>
  );
}

export function ResultPanelsGridView(props: {
  panels: ResultPanel[];
  width: number;
  panelHeight?: number;
}) {
  const panelHeight = props.panelHeight ?? 220;
  return (
    <View style={{ gap: 16 }}>
      {props.panels.map((panel) => (
        <ResultPanelChart key={`${panel.kind}:${panel.path}:${panel.title}`} panel={panel} width={props.width} height={panelHeight} />
      ))}
    </View>
  );
}

export const RESULT_PDF_FILE_NAME = "result.pdf";

export function pdfBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildResultPdfFromCaptures(_pages: Array<{ title: string; imageBase64: string; width: number; height: number }>): Uint8Array {
  return new TextEncoder().encode("%PDF-1.4\n%%EOF");
}
