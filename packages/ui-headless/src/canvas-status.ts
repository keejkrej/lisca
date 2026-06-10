import type { CanvasStatusMessage } from "./types";

export function shouldShowLoadingIcon(message: CanvasStatusMessage): boolean {
  if (message.tone != null) return false;
  return /loading|scanning|preview/i.test(message.text);
}

export function shouldHideToastText(message: CanvasStatusMessage): boolean {
  return shouldShowLoadingIcon(message);
}

export type CanvasToastPresentation = "error" | "loading" | "text";

export function canvasToastPresentation(message: CanvasStatusMessage): CanvasToastPresentation {
  if (message.tone === "error") return "error";
  if (shouldShowLoadingIcon(message)) return "loading";
  return "text";
}
