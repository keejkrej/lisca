import { toast } from "sonner";

const SUCCESS_TOAST_DURATION_MS = 3000;
const ERROR_TOAST_DURATION_MS = 6000;

export function showSuccessToast(message: string) {
  toast.success(message, {
    duration: SUCCESS_TOAST_DURATION_MS,
  });
}

export function showErrorToast(message: string) {
  toast.error(message, {
    duration: ERROR_TOAST_DURATION_MS,
  });
}
