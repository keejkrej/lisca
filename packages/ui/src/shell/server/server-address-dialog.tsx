"use client";

import { parseLiscaServerAddress } from "@lisca/utils";
import { useEffect, useState } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import { DialogSurface } from "../modal/dialog-surface";
import { ModalScrim } from "../modal/modal-scrim";

export type ServerAddressDialogProps = {
  open: boolean;
  defaultPort: number;
  localLabel: string;
  currentWsUrl: string;
  activeAddress: string | null;
  savedServers: string[];
  onOpenChange: (open: boolean) => void;
  onAddServer: (address: string) => void;
  onRemoveServer: (address: string) => void;
  onConnect: (address: string | null) => void;
};

export function ServerAddressDialog({
  open,
  defaultPort,
  localLabel,
  currentWsUrl,
  activeAddress,
  savedServers,
  onOpenChange,
  onAddServer,
  onRemoveServer,
  onConnect,
}: ServerAddressDialogProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;

  const addServer = () => {
    try {
      parseLiscaServerAddress(draft, { defaultPort });
      onAddServer(draft);
      setDraft("");
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const isLocalActive = activeAddress == null;

  return (
    <ModalScrim
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <DialogSurface aria-labelledby="server-address-title" className="max-h-[86vh]" maxWidth="lg">
        <div className="space-y-1 border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground text-lg" id="server-address-title">
            Servers
          </h2>
          <p className="text-muted-foreground text-sm">
            Saved servers are remembered locally. The app always starts on{" "}
            <span className="font-mono">{localLabel}</span> until you connect to another.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <p className="font-medium text-foreground text-sm">Connected</p>
            <p className="font-mono text-muted-foreground text-xs break-all">{currentWsUrl}</p>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground text-sm">Choose server</p>
            <div className="space-y-1.5">
              <button
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  isLocalActive
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/40",
                )}
                type="button"
                onClick={() => {
                  onConnect(null);
                  onOpenChange(false);
                }}
              >
                <span className="font-medium">Local</span>
                <span className="font-mono text-muted-foreground text-xs">{localLabel}</span>
              </button>
              {savedServers.map((address) => {
                const active = activeAddress === address;
                return (
                  <div
                    key={address}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                      active ? "border-primary bg-primary/10" : "border-border",
                    )}
                  >
                    <button
                      className="min-w-0 flex-1 px-1 py-1 text-left text-sm hover:opacity-80"
                      type="button"
                      onClick={() => {
                        onConnect(address);
                        onOpenChange(false);
                      }}
                    >
                      <span className="block truncate font-mono text-xs">{address}</span>
                    </button>
                    <Button
                      size="sm"
                      type="button"
                      variant={active ? "default" : "outline"}
                      onClick={() => {
                        onConnect(address);
                        onOpenChange(false);
                      }}
                    >
                      Connect
                    </Button>
                    <Button
                      aria-label={`Remove server ${address}`}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                      onClick={() => onRemoveServer(address)}
                    >
                      ×
                    </Button>
                  </div>
                );
              })}
              {savedServers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No saved servers yet.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground text-sm">Add server</p>
            <div className="flex gap-2">
              <Input
                aria-invalid={error ? true : undefined}
                className="min-w-0 flex-1"
                placeholder={`e.g. 192.168.1.10:${defaultPort}`}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
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
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button size="sm" type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
