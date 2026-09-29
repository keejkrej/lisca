import { ClientError } from "./client-error";

function isInvalidApiJsonResponse(message: string): boolean {
  return (
    message.includes("Could not parse JSON") ||
    (message.includes("Encoded side transformation failure") && message.includes("Could not parse"))
  );
}

function formatInvalidApiJsonResponse(fallback: string): string {
  return `${fallback}: API returned a non-JSON response. Ensure the Rust backend is running (e.g. \`pnpm run dev:studio\`).`;
}

export function toFetchErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ClientError) {
    if (cause.cause != null && cause.cause !== cause) {
      return toFetchErrorMessage(cause.cause, fallback);
    }
    const clientMessage = cause.message.trim();
    if (clientMessage) {
      if (isInvalidApiJsonResponse(clientMessage)) {
        return formatInvalidApiJsonResponse(fallback);
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
    return `${fallback}: server unreachable`;
  }
  if (message && isInvalidApiJsonResponse(message)) {
    return formatInvalidApiJsonResponse(fallback);
  }
  return message ? `${fallback}: ${message}` : fallback;
}
