import { AsyncResult } from "effect/unstable/reactivity";
import { Cause } from "effect";

export function resultData<A>(
  result: AsyncResult.AsyncResult<A, unknown> | undefined,
): A | undefined {
  if (!result || !AsyncResult.isSuccess(result)) return undefined;
  return result.value;
}

export function resultLoading(
  result: AsyncResult.AsyncResult<unknown, unknown> | undefined,
): boolean {
  if (!result) return false;
  return AsyncResult.isInitial(result) || AsyncResult.isWaiting(result);
}

export function resultFailureMessage(
  result: AsyncResult.AsyncResult<unknown, unknown> | undefined,
): string | undefined {
  if (!result || !AsyncResult.isFailure(result)) return undefined;
  return Cause.pretty(result.cause);
}
