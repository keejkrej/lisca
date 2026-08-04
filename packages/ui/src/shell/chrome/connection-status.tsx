import IconDesktopTowerRegular from "phosphor-icons-solid/IconDesktopTowerRegular";
import { cn } from "../../lib/utils";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

function statusDotClass(state: ConnectionState): string {
  switch (state) {
    case "open":
      return "bg-emerald-500";
    case "closed":
      return "bg-red-500";
    case "connecting":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground/40";
  }
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
  /** Defaults to `"Server"`. */
  label?: string;
}) {
  const title = () => props.label ?? "Server";
  const label = () => statusLabel(props.state);

  return (
    <div
      class={cn(
        "flex items-center gap-1.5 py-1.5 text-sm whitespace-normal cursor-default",
      )}
      title={`${label()} · ${props.httpBaseUrl}`}
      aria-label={`${title()} ${label()}`}
    >
      <IconDesktopTowerRegular class="size-4 shrink-0 opacity-70" aria-hidden />
      <span>{title()}</span>
      <span
        class={cn("size-2 shrink-0 rounded-full", statusDotClass(props.state))}
        aria-hidden
      />
    </div>
  );
}
