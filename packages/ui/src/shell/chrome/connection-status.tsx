import { buttonVariants } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

export function ConnectionStatus(props: {
  wsUrl: string;
  state: ConnectionState;
  /** Defaults to `"Server"`. */
  label?: string;
  onOpenSettings?: () => void;
}) {
  const title = props.label ?? "Server";
  const statusLabel =
    props.state === "open"
      ? "Connected"
      : props.state === "connecting"
        ? "Connecting…"
        : props.state === "closed"
          ? "Disconnected"
          : "Idle";

  const dot =
    props.state === "open"
      ? "bg-emerald-500"
      : props.state === "connecting"
        ? "bg-amber-400"
        : "bg-neutral-300 dark:bg-neutral-600";

  const className = cn(
    buttonVariants({ size: "sm", variant: "outline" }),
    "h-auto min-h-0 gap-1.5 py-1.5 whitespace-normal shadow-none before:shadow-none hover:bg-popover data-pressed:bg-popover dark:hover:bg-input/32",
    props.onOpenSettings ? "cursor-pointer" : "cursor-default",
  );
  const titleAttr = props.onOpenSettings
    ? `${props.wsUrl}\nClick to change server address`
    : props.wsUrl;

  const ariaLabel = props.onOpenSettings
    ? `${title}: ${statusLabel}. Click to change server address.`
    : `${title}: ${statusLabel}`;

  if (props.onOpenSettings) {
    return (
      <button
        aria-label={ariaLabel}
        className={className}
        title={titleAttr}
        type="button"
        onClick={props.onOpenSettings}
      >
        <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
        <span className="font-medium">{title}</span>
        <span className="opacity-70">{statusLabel}</span>
      </button>
    );
  }

  return (
    <div className={className} title={titleAttr}>
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="font-medium">{title}</span>
      <span className="opacity-70">{statusLabel}</span>
    </div>
  );
}
