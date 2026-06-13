import { Alert, Platform } from "react-native";

export let studioAnnotateDirty = false;

export function setStudioAnnotateDirty(dirty: boolean): void {
  studioAnnotateDirty = dirty;
}

export function confirmStudioAnnotateLeave(): Promise<boolean> {
  if (!studioAnnotateDirty) return Promise.resolve(true);
  if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") {
    return Promise.resolve(window.confirm("Discard unsaved annotation changes?"));
  }
  return new Promise((resolve) => {
    Alert.alert("Unsaved changes", "Discard unsaved annotation changes?", [
      { text: "Stay", style: "cancel", onPress: () => resolve(false) },
      { text: "Discard", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
