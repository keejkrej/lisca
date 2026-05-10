import { buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

export function ConnectionStatus(props: {
  wsUrl: string;
  state: ConnectionState;
  /** Defaults to `"Server"`. */
  label?: string;
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

  return (
    <div
      className={cn(
        buttonVariants({ size: "sm", variant: "outline" }),
        "h-auto min-h-0 cursor-default gap-1.5 py-1.5 whitespace-normal shadow-none before:shadow-none hover:bg-popover data-pressed:bg-popover dark:hover:bg-input/32",
      )}
      title={props.wsUrl}
    >
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="font-medium">{title}</span>
      <span className="opacity-70">{statusLabel}</span>
    </div>
  );
}
