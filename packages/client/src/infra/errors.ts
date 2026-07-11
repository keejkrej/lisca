import { ClientError } from "./client-error";

function isInvalidApiJsonResponse(message: string): boolean {
  return (
    message.includes("Could not parse JSON") ||
    (message.includes("Encoded side transformation failure") && message.includes("Could not parse"))
  );
}

function formatInvalidApiJsonResponse(fallback: string, serverAddress: string): string {
  return `${fallback}: API returned a non-JSON response from ${serverAddress}. Ensure the Rust backend is running (e.g. \`vp run dev:aligner\` or \`vp run --filter @lisca/aligner-server dev\`).`;
}

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
      if (isInvalidApiJsonResponse(clientMessage)) {
        return formatInvalidApiJsonResponse(fallback, serverAddress);
      }
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
  if (message && isInvalidApiJsonResponse(message)) {
    return formatInvalidApiJsonResponse(fallback, serverAddress);
  }
  return message ? `${fallback}: ${message}` : fallback;
}
