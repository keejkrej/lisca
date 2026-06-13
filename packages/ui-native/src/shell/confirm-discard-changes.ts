import { Alert, Platform } from "react-native";

const DISCARD_MESSAGE = "Discard unsaved annotation changes?";

export function confirmDiscardAnnotationChanges(): Promise<boolean> {
  if (
    Platform.OS === "web" &&
    typeof globalThis.window !== "undefined" &&
    typeof globalThis.window.confirm === "function"
  ) {
    return Promise.resolve(globalThis.window.confirm(DISCARD_MESSAGE));
  }
  return new Promise((resolve) => {
    Alert.alert("Unsaved changes", DISCARD_MESSAGE, [
      { text: "Stay", style: "cancel", onPress: () => resolve(false) },
      { text: "Discard", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
