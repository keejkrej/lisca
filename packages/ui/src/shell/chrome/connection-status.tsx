import { buttonVariants } from "../../components/ui/button";
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

  const dot = () =>
    props.state === "open"
      ? "bg-emerald-500"
      : props.state === "connecting"
        ? "bg-amber-400"
        : "bg-neutral-300 dark:bg-neutral-600";

  const className = () =>
    cn(
      buttonVariants({ size: "sm", variant: "outline" }),
      "h-auto min-h-0 gap-1.5 py-1.5 whitespace-normal shadow-none before:shadow-none cursor-default",
    );

  return (
    <div class={className()} title={props.httpBaseUrl}>
      <span class={`size-2 shrink-0 rounded-full ${dot()}`} aria-hidden />
      <span class="font-medium">{title()}</span>
      <span class="opacity-70">{statusLabel()}</span>
    </div>
  );
}