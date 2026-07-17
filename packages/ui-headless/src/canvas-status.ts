import type { CanvasStatusMessage } from "./types";

export type CanvasToastPresentation = "error" | "text";

export function canvasToastPresentation(message: CanvasStatusMessage): CanvasToastPresentation {
  if (message.tone === "error") return "error";
  return "text";
}
