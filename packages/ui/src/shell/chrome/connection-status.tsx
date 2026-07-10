import { cn } from "../../lib/utils";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

export function ConnectionStatus(props: {
  httpBaseUrl: string;
  state: ConnectionState;
  /** Defaults to `"Server"`. */
  label?: string;
}) {
  const title = () => props.label ?? "Server";
  const statusLabel = () =>
    props.state === "open"
      ? "Connected"
      : props.state === "connecting"
        ? "Connecting…"
        : props.state === "closed"
          ? "Disconnected"
          : "Idle";

  return (
    <div
      class={cn(
        "flex items-center gap-1.5 py-1.5 text-sm whitespace-normal cursor-default",
      )}
      title={props.httpBaseUrl}
    >
      <span class="font-medium">{title()}</span>
      <span class="opacity-70">{statusLabel()}</span>
    </div>
  );
}