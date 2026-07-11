import type { CanvasStatusMessage } from "./types";

export function shouldShowLoadingIcon(_message: CanvasStatusMessage): boolean {
  return false;
}

export function shouldHideToastText(_message: CanvasStatusMessage): boolean {
  return false;
}

export type CanvasToastPresentation = "error" | "text";

export function canvasToastPresentation(message: CanvasStatusMessage): CanvasToastPresentation {
  if (message.tone === "error") return "error";
  return "text";
}