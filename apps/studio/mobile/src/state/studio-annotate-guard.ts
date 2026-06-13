import { confirmDiscardAnnotationChanges } from "@lisca/ui-native";

export let studioAnnotateDirty = false;

export function setStudioAnnotateDirty(dirty: boolean): void {
  studioAnnotateDirty = dirty;
}

export function confirmStudioAnnotateLeave(): Promise<boolean> {
  if (!studioAnnotateDirty) return Promise.resolve(true);
  return confirmDiscardAnnotationChanges();
}
