import { cn } from "../../lib/utils";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

export function HostDot(props: { state: ConnectionState; class?: string }) {
  return (
    <span
      aria-hidden="true"
      class={cn(
        "size-1.5 shrink-0 rounded-full",
        props.state === "open" ? "bg-foreground" : "bg-muted-foreground",
        props.class,
      )}
      data-slot="connection-status-dot"
      data-state={props.state}
    />
  );
}

function statusLabel(state: ConnectionState): string {
  switch (state) {
    case "open":
      return "Connected";
    case "connecting":
      return "Connecting…";
    case "closed":
      return "Disconnected";
    default:
      return "Idle";
  }
}

export function ConnectionStatus(props: {
  httpBaseUrl: string;
  state: ConnectionState;
  /** Accessible host name. Defaults to `"Server"`. */
  label?: string;
}) {
  const title = () => props.label ?? "Server";
  const label = () => statusLabel(props.state);

  return (
    <div
      class="flex h-7 cursor-default items-center gap-1.5 px-2 text-xs text-muted-foreground"
      title={`${label()} · ${props.httpBaseUrl}`}
      aria-label={`${title()} ${label()}`}
      role="status"
      data-slot="connection-status"
      data-state={props.state}
    >
      <span>{label()}</span>
      <HostDot state={props.state} />
    </div>
  );
}
