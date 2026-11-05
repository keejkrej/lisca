import { liscaDesktopBridge } from "@lisca/client/desktop";
import type { LiscaWorkspaceControl } from "@lisca/client/desktop";
import { Button } from "@lisca/ui/primitives";
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";

/**
 * Full-width replacement for the normal Studio top bar while an agent owns a
 * workspace. It disappears when the session ends, restoring the usual chrome.
 */
export function AgentActivity(props: {
  onSessionsChange?: (sessions: LiscaWorkspaceControl[]) => void;
}) {
  const bridge = liscaDesktopBridge();
  const [sessions, setSessions] = createSignal<LiscaWorkspaceControl[]>([]);
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
    void refresh();
    const timer = setInterval(() => void refresh(), 1_000);
    onCleanup(() => clearInterval(timer));
  });

  createEffect(() => {
    const mode = sessions()[0]?.mode;
    const agentHasControl = mode === "agent-running" || mode === "agent-paused";
    for (const element of document.querySelectorAll<HTMLElement>(
      "#main-content, aside[aria-label='Right panel']",
    )) {
      element.inert = agentHasControl;
    }
  });
  onCleanup(() => {
    for (const element of document.querySelectorAll<HTMLElement>(
      "#main-content, aside[aria-label='Right panel']",
    )) {
      element.inert = false;
    }
  });

  const act = async (
    action: ((workspacePath: string) => Promise<LiscaWorkspaceControl>) | undefined,
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
          class="col-span-3 flex h-full w-full min-w-0 items-center justify-between gap-3 text-sm"
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
