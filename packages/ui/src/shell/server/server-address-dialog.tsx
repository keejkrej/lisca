import { parseLiscaServerAddress } from "@lisca/utils";
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import { DialogSurface } from "../modal/dialog-surface";
import { ModalScrim } from "../modal/modal-scrim";

export type ServerAddressDialogProps = {
  open: boolean;
  defaultPort: number;
  localLabel: string;
  currentHttpBaseUrl: string;
  activeAddress: string | null;
  savedServers: string[];
  onOpenChange: (open: boolean) => void;
  onAddServer: (address: string) => void;
  onRemoveServer: (address: string) => void;
  onConnect: (address: string | null) => void;
};

export function ServerAddressDialog(props: ServerAddressDialogProps) {
  const [draft, setDraft] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    if (!props.open) return;
    setDraft("");
    setError(null);
  });

  createEffect(() => {
    if (!props.open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  const addServer = () => {
    try {
      parseLiscaServerAddress(draft(), { defaultPort: props.defaultPort });
      props.onAddServer(draft());
      setDraft("");
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const isLocalActive = () => props.activeAddress == null;

  return (
    <Show when={props.open}>
      <ModalScrim
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) props.onOpenChange(false);
        }}
      >
        <DialogSurface aria-labelledby="server-address-title" class="max-h-[86vh]" maxWidth="lg">
          <div class="space-y-1 border-b border-border px-5 py-4">
            <h2 class="font-semibold text-foreground text-lg" id="server-address-title">
              Servers
            </h2>
            <p class="text-muted-foreground text-sm">
              Saved servers are remembered locally. The app always starts on{" "}
              <span class="font-mono">{props.localLabel}</span> until you connect to another.
            </p>
          </div>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div class="space-y-2">
              <p class="font-medium text-foreground text-sm">Connected</p>
              <p class="font-mono text-muted-foreground text-xs break-all">
                {props.currentHttpBaseUrl}
              </p>
            </div>

            <div class="space-y-2">
              <p class="font-medium text-foreground text-sm">Choose server</p>
              <div class="space-y-1.5">
                <button
                  class={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isLocalActive()
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/40",
                  )}
                  type="button"
                  onClick={() => {
                    props.onConnect(null);
                    props.onOpenChange(false);
                  }}
                >
                  <span class="font-medium">Local</span>
                  <span class="font-mono text-muted-foreground text-xs">{props.localLabel}</span>
                </button>
                <For each={props.savedServers}>
                  {(address) => {
                    const active = () => props.activeAddress === address;
                    return (
                      <div
                        class={cn(
                          "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                          active() ? "border-primary bg-primary/10" : "border-border",
                        )}
                      >
                        <button
                          class="min-w-0 flex-1 px-1 py-1 text-left text-sm hover:opacity-80"
                          type="button"
                          onClick={() => {
                            props.onConnect(address);
                            props.onOpenChange(false);
                          }}
                        >
                          <span class="block truncate font-mono text-xs">{address}</span>
                        </button>
                        <Button
                          size="sm"
                          type="button"
                          variant={active() ? "default" : "outline"}
                          onClick={() => {
                            props.onConnect(address);
                            props.onOpenChange(false);
                          }}
                        >
                          Connect
                        </Button>
                        <Button
                          aria-label={`Remove server ${address}`}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                          onClick={() => props.onRemoveServer(address)}
                        >
                          ×
                        </Button>
                      </div>
                    );
                  }}
                </For>
                <Show when={props.savedServers.length === 0}>
                  <p class="text-muted-foreground text-sm">No saved servers yet.</p>
                </Show>
              </div>
            </div>

            <div class="space-y-2">
              <p class="font-medium text-foreground text-sm">Add server</p>
              <div class="flex gap-2">
                <Input
                  aria-invalid={error() ? true : undefined}
                  class="min-w-0 flex-1"
                  placeholder={`e.g. 192.168.1.10:${props.defaultPort}`}
                  value={draft()}
                  onInput={(event) => {
                    setDraft(event.currentTarget.value);
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addServer();
                  }}
                />
                <Button size="sm" type="button" variant="outline" onClick={addServer}>
                  Add
                </Button>
              </div>
              <Show when={error()}>
                <p class="text-destructive text-sm">{error()}</p>
              </Show>
            </div>
          </div>

          <div class="flex justify-end border-t border-border px-5 py-3">
            <Button size="sm" type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}