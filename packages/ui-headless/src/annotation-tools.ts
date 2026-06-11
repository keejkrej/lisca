export type AnnotationTool =
  | "brush"
  | "brush-erase"
  | "lasso"
  | "lasso-erase"
  | "smart-segment";

export const ANNOTATION_TOOL_DEFINITIONS: { id: AnnotationTool; label: string }[] = [
  { id: "brush", label: "Brush" },
  { id: "brush-erase", label: "Brush Erase" },
  { id: "lasso", label: "Lasso" },
  { id: "lasso-erase", label: "Lasso Erase" },
  { id: "smart-segment", label: "Smart Segment" },
];

export function toolCanRunWithoutLabel(tool: AnnotationTool): boolean {
  return tool === "brush-erase" || tool === "lasso-erase";
}
