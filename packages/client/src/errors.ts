export function toFetchErrorMessage(
  cause: unknown,
  fallback: string,
  serverAddress: string,
): string {
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
