import { Cause, Option } from "effect";

export function effectCauseToError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  if (Cause.isCause(error)) {
    const failure = Cause.failureOption(error);
    if (Option.isSome(failure)) return effectCauseToError(failure.value, fallback);
    const defect = Cause.dieOption(error);
    if (Option.isSome(defect)) return effectCauseToError(defect.value, fallback);
    return effectCauseToError(Cause.squash(error), fallback);
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }
  return new Error(typeof error === "string" && error ? error : fallback);
}
