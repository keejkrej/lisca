import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export type ShellWorkspaceControlMode =
  | "human-control"
  | "agent-running"
  | "agent-paused"
  | "user-takeover";

export type ShellWorkspaceControlOperation = {
  requestId: string;
  kind: "mutation" | "crop" | "analysis";
  label: string;
  detail?: string | null;
};

export type ShellWorkspaceControlSession = {
  workspacePath: string;
  mode: ShellWorkspaceControlMode;
  agentName?: string | null;
  operation?: ShellWorkspaceControlOperation | null;
  revision: number;
};

type DesktopControlBridge = {
  controlList?: () => Promise<ShellWorkspaceControlSession[]>;
  controlPause?: (workspacePath: string) => Promise<ShellWorkspaceControlSession>;
  controlTakeover?: (workspacePath: string) => Promise<ShellWorkspaceControlSession>;
  controlHandback?: (workspacePath: string) => Promise<ShellWorkspaceControlSession>;
  controlStop?: (workspacePath: string) => Promise<ShellWorkspaceControlSession>;
};

function desktopControlBridge(): DesktopControlBridge | null {
  if (typeof window === "undefined") return null;
  const desktop = (window as Window & { liscaDesktop?: DesktopControlBridge }).liscaDesktop;
  return desktop?.controlList ? desktop : null;
}

const INERT_STAGE_SELECTOR =
  "#main-content, aside[aria-label='Left panel'], aside[aria-label='Right panel']";

/**
 * Full-width replacement for the top bar while an MCP agent owns a workspace.
 * Restores normal chrome when the session ends.
 */
export function ShellAgentActivity(props: {
  class?: string;
  onSessionsChange?: (sessions: ShellWorkspaceControlSession[]) => void;
}) {
  const bridge = desktopControlBridge();
  const [sessions, setSessions] = createSignal<ShellWorkspaceControlSession[]>([]);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const refresh = async () => {
    if (!bridge?.controlList) return;
    try {
      const next = await bridge.controlList();
      setSessions(next);
      props.onSessionsChange?.(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read agent activity.");
    }
  };

  onMount(() => {
    if (!bridge?.controlList) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 1_000);
    onCleanup(() => clearInterval(timer));
  });

  createEffect(() => {
    const mode = sessions()[0]?.mode;
    const agentHasControl = mode === "agent-running" || mode === "agent-paused";
    if (typeof document === "undefined") return;
    for (const element of document.querySelectorAll<HTMLElement>(INERT_STAGE_SELECTOR)) {
      element.inert = agentHasControl;
    }
  });

  onCleanup(() => {
    if (typeof document === "undefined") return;
    for (const element of document.querySelectorAll<HTMLElement>(INERT_STAGE_SELECTOR)) {
      element.inert = false;
    }
  });

  const act = async (
    action: ((workspacePath: string) => Promise<ShellWorkspaceControlSession>) | undefined,
  ) => {
    const current = sessions()[0];
    if (!action || !current) return;
    setBusy(true);
    try {
      await action(current.workspacePath);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change workspace control.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Show when={sessions()[0]}>
      {(session) => (
        <div
          aria-live="polite"
          class={cn(
            "col-span-3 flex h-full w-full min-w-0 items-center justify-between gap-3 text-sm",
            props.class,
          )}
          data-agent-state={session().mode}
          title={`${session().workspacePath} · revision ${session().revision}${error() ? `\n${error()}` : ""}`}
        >
          <span class="flex min-w-0 items-center gap-2 text-muted-foreground">
            <span
              aria-hidden="true"
              class={`size-2 shrink-0 rounded-full ${
                session().mode === "agent-running" ? "animate-pulse bg-primary" : "bg-amber-500"
              }`}
            />
            <span class="truncate">
              <span class="font-medium text-foreground">
                {session().mode === "user-takeover"
                  ? "You have control"
                  : `${session().agentName ?? "unknown"} agent is controlling`}
              </span>
              <Show
                when={
                  session().mode === "user-takeover" ? "Agent paused" : session().operation?.label
                }
              >
                {(label) => (
                  <span>
                    {" · "}
                    {label()}
                  </span>
                )}
              </Show>
              <Show when={session().operation?.detail}>
                {(detail) => <span> · {detail()}</span>}
              </Show>
            </span>
          </span>
          <div class="flex shrink-0 items-center gap-1">
            <Show when={session().mode === "agent-running"}>
              <Button
                disabled={busy()}
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => void act(bridge?.controlPause)}
              >
                Pause
              </Button>
            </Show>
            <Show when={session().mode !== "user-takeover"}>
              <Button
                class="shrink-0"
                disabled={busy()}
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => void act(bridge?.controlTakeover)}
              >
                Take over
              </Button>
            </Show>
            <Show when={session().mode !== "agent-running"}>
              <Button
                class="shrink-0"
                disabled={busy()}
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => void act(bridge?.controlHandback)}
              >
                Hand back
              </Button>
            </Show>
            <Button
              class="shrink-0"
              disabled={busy()}
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => void act(bridge?.controlStop)}
            >
              Stop
            </Button>
          </div>
        </div>
      )}
    </Show>
  );
}
