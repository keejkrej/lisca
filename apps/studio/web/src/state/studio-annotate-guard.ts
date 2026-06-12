export let studioAnnotateDirty = false;

export function setStudioAnnotateDirty(dirty: boolean): void {
  studioAnnotateDirty = dirty;
}

export function confirmStudioAnnotateLeave(): boolean {
  if (!studioAnnotateDirty) return true;
  return window.confirm("Discard unsaved annotation changes?");
}
