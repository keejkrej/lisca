export type AnnotationTool =
  | "brush"
  | "brush-erase"
  | "lasso"
  | "lasso-erase"
  | "smart"
  | "smart-erase"
  | "magnifier";

export type AnnotationToolFamily = "brush" | "lasso" | "smart" | "magnifier";

export const ANNOTATION_TOOL_DEFINITIONS: { id: AnnotationTool; label: string }[] = [
  { id: "brush", label: "Brush" },
  { id: "brush-erase", label: "Brush Erase" },
  { id: "lasso", label: "Lasso" },
  { id: "lasso-erase", label: "Lasso Erase" },
  { id: "smart", label: "Smart" },
  { id: "smart-erase", label: "Smart Erase" },
  { id: "magnifier", label: "Magnifier" },
];

/** Paint tools first row, erase variants second — indices into ANNOTATION_TOOL_DEFINITIONS. */
export const ANNOTATION_TOOL_GRID_ROWS = [
  [0, 2, 4],
  [1, 3, 5],
] as const;

export function annotationToolFamily(tool: AnnotationTool): AnnotationToolFamily {
  switch (tool) {
    case "brush":
    case "brush-erase":
      return "brush";
    case "lasso":
    case "lasso-erase":
      return "lasso";
    case "smart":
    case "smart-erase":
      return "smart";
    case "magnifier":
      return "magnifier";
  }
}

export function isSmartAnnotationTool(tool: AnnotationTool): boolean {
  return tool === "smart" || tool === "smart-erase";
}

export function isMagnifierAnnotationTool(tool: AnnotationTool): boolean {
  return tool === "magnifier";
}

export function toolCanRunWithoutLabel(tool: AnnotationTool): boolean {
  return (
    tool === "brush-erase" ||
    tool === "lasso-erase" ||
    tool === "smart-erase" ||
    tool === "magnifier"
  );
}
