import IconWarningCircleRegular from "phosphor-icons-solid/IconWarningCircleRegular";
import { createSignal, onCleanup, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "../../components/ui/popover";
import { hasEmbeddedBackend } from "../server/shell-server";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

/** How long "Retry now" shows its busy state; the probe itself keeps running afterwards. */
const RETRY_FEEDBACK_MS = 1_200;

/** Web builds call the server on their own origin (ADR-0003), so the page host is the server. */
function serverHost(): string {
  return typeof window === "undefined" ? "The server" : window.location.host;
}

/**
 * Server reachability, surfaced only when it needs attention. A healthy (or still booting)
 * connection shows nothing; desktop builds never show it because the backend runs in-process.
 * When the server stops answering, a warning chip explains what happened and how to recover,
 * while the app keeps retrying on its own and hides the chip as soon as the server is back.
 */
export function ConnectionStatus(props: {
  state: ConnectionState;
  /** Probe the server immediately. */
  onRetry?: () => void;
}) {
  const [retrying, setRetrying] = createSignal(false);
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(retryTimer));

  const retry = () => {
    props.onRetry?.();
    setRetrying(true);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => setRetrying(false), RETRY_FEEDBACK_MS);
  };

  return (
    <Show when={props.state === "closed" && !hasEmbeddedBackend()}>
      <Popover placement="bottom-end">
        <PopoverTrigger
          aria-label="Server unreachable"
          class="z-destructive-surface flex h-7 cursor-pointer items-center gap-1.5 border px-2 text-xs font-medium"
          data-slot="connection-status"
          data-state={props.state}
          title={serverHost()}
        >
          <IconWarningCircleRegular aria-hidden="true" class="size-3.5 shrink-0" />
          Server unreachable
        </PopoverTrigger>
        <PopoverContent class="flex w-80 flex-col gap-3 p-4">
          <div class="flex flex-col gap-1.5">
            <PopoverTitle>Can't reach the server</PopoverTitle>
            <PopoverDescription>
              {serverHost()} isn't responding. Nothing on this page is lost; the app keeps retrying
              and picks up where you left off once the server is back.
            </PopoverDescription>
          </div>
          <p class="text-xs leading-relaxed text-muted-foreground">
            {import.meta.env.DEV
              ? "Development: check the Rust server is still running in your dev terminal. It stops answering while it recompiles after a code change."
              : "Deployment: the server behind this page stopped responding. Restart it (for Docker, restart the container) or contact whoever runs it."}
          </p>
          <Button
            class="self-start"
            disabled={retrying()}
            size="sm"
            type="button"
            variant="outline"
            onClick={retry}
          >
            {retrying() ? "Retrying…" : "Retry now"}
          </Button>
        </PopoverContent>
      </Popover>
    </Show>
  );
}
