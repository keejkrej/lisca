import type { createAlignCanvasPointerHandlers } from "@lisca/instrument";
import type { VarExcludeController } from "@lisca/smart/var-exclude";

import type { StudioAlignState } from "./use-studio-align-state";

export type StudioAlignPointerHandlers = ReturnType<typeof createAlignCanvasPointerHandlers>;
export type StudioVarExclude = VarExcludeController;

export type StudioAlignPageContextValue = {
  readonly state: StudioAlignState;
  readonly varExclude: StudioVarExclude;
  readonly pointer: StudioAlignPointerHandlers;
  readonly visibleStatus: string | null;
  readonly excludeActive: () => boolean;
  /** Selection var exclude — additive on current exclusions; applying also excludes edge patterns. */
  readonly requestVarExclude: () => Promise<void>;
  readonly applyExcludePreview: () => void;
  readonly cancelExcludePreview: () => void;
};

export type StudioAlignPageController = {
  readonly getContext: () => StudioAlignPageContextValue;
  readonly getState: () => StudioAlignState;
  readonly setNavigate: (navigate: (to: string) => void) => void;
  readonly subscribe: (listener: () => void) => () => void;
  readonly dispose: () => void;
};

const alignControllers = new Map<string, StudioAlignPageController>();

export function registerStudioAlignPageController(
  instanceId: string,
  controller: StudioAlignPageController,
): StudioAlignPageController {
  alignControllers.set(instanceId, controller);
  return controller;
}

export function getStudioAlignPageController(
  instanceId: string,
): StudioAlignPageController | undefined {
  return alignControllers.get(instanceId);
}

export function disposeStudioAlignPageController(instanceId: string): void {
  const controller = alignControllers.get(instanceId);
  if (!controller) return;
  alignControllers.delete(instanceId);
  controller.dispose();
}
