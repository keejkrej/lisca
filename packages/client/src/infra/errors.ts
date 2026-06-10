import { ClientError } from "./client-error.ts";

export function toFetchErrorMessage(
  cause: unknown,
  fallback: string,
  serverAddress: string,
): string {
  if (cause instanceof ClientError) {
    if (cause.cause != null && cause.cause !== cause) {
      return toFetchErrorMessage(cause.cause, fallback, serverAddress);
    }
    const clientMessage = cause.message.trim();
    if (clientMessage) {
      return `${fallback}: ${clientMessage}`;
    }
  }
  const message = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
  if (
    cause instanceof TypeError ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("fetch failed")
  ) {
    return `${fallback}: server unreachable at ${serverAddress}`;
  }
  return message ? `${fallback}: ${message}` : fallback;
}
