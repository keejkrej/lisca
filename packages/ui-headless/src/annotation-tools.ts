export type AnnotationTool =
  | "brush"
  | "brush-erase"
  | "lasso"
  | "lasso-erase"
  | "smart"
  | "smart-erase";

export const ANNOTATION_TOOL_DEFINITIONS: { id: AnnotationTool; label: string }[] = [
  { id: "brush", label: "Brush" },
  { id: "brush-erase", label: "Brush Erase" },
  { id: "lasso", label: "Lasso" },
  { id: "lasso-erase", label: "Lasso Erase" },
  { id: "smart", label: "Smart" },
  { id: "smart-erase", label: "Smart Erase" },
];

export function isSmartAnnotationTool(tool: AnnotationTool): boolean {
  return tool === "smart" || tool === "smart-erase";
}

export function toolCanRunWithoutLabel(tool: AnnotationTool): boolean {
  return tool === "brush-erase" || tool === "lasso-erase" || tool === "smart-erase";
}
