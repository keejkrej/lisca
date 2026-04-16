import { toastManager } from "lisca/shared/ui";

const SUCCESS_TOAST_DURATION_MS = 3000;
const ERROR_TOAST_DURATION_MS = 6000;

export function showSuccessToast(message: string) {
  toastManager.add({
    duration: SUCCESS_TOAST_DURATION_MS,
    title: message,
    variant: "success",
  });
}

export function showErrorToast(message: string) {
  toastManager.add({
    duration: ERROR_TOAST_DURATION_MS,
    title: message,
    variant: "error",
  });
}
