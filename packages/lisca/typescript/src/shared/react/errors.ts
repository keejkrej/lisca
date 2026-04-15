import { Cause, Option } from "effect";

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }
  if (Cause.isCause(error)) {
    const failure = Cause.failureOption(error);
    if (Option.isSome(failure)) {
      return toError(failure.value, fallback);
    }
    const defect = Cause.dieOption(error);
    if (Option.isSome(defect)) {
      return toError(defect.value, fallback);
    }
    const squashed = Cause.squash(error);
    return toError(squashed, fallback);
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message.length > 0
  ) {
    return new Error((error as { message: string }).message);
  }
  return new Error(typeof error === "string" && error.length > 0 ? error : fallback);
}

export function toErrorMessage(error: unknown, fallback = "Unknown viewer error"): string {
  return toError(error, fallback).message;
}
