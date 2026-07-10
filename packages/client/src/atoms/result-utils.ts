import { Result } from "@effect-atom/atom-solid";
import { Cause } from "effect";

export function resultData<A>(result: Result.Result<A, unknown> | undefined): A | undefined {
  if (!result || !Result.isSuccess(result)) return undefined;
  return result.value;
}

export function resultLoading(result: Result.Result<unknown, unknown> | undefined): boolean {
  if (!result) return false;
  return Result.isInitial(result) || Result.isWaiting(result);
}

export function resultFailureMessage(
  result: Result.Result<unknown, unknown> | undefined,
): string | undefined {
  if (!result || !Result.isFailure(result)) return undefined;
  return Cause.pretty(result.cause);
}
