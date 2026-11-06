import { ConnectionStatus, ShellThemeToggle, useShellServer } from "@lisca/ui/shell";
import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import { Show, createSignal } from "solid-js";
import type { LiscaWorkspaceControl } from "@lisca/client/desktop";

import { setStudioExpertMode, studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import { useStudioCommandShortcut } from "../navigation/use-studio-command-shortcut";
import { StudioExpertToggle } from "./studio-expert-toggle";
import { AgentActivity } from "./agent-activity";
import { StudioAgentNavigation } from "./studio-agent-navigation";
import { StudioPageTaskCenter } from "./studio-task-center";
import { StudioSettings } from "./studio-settings";

export function StudioTopBar(props: { showExpert?: boolean }) {
  const [agentActive, setAgentActive] = createSignal(false);
  const [agentSessions, setAgentSessions] = createSignal<LiscaWorkspaceControl[]>([]);
  const server = useShellServer();
  const expertMode = useAtomValue(() => studioExpertModeAtom);
  const setExpertMode = useAtomSet(() => studioExpertModeAtom);
  useStudioCommandShortcut(
    "expert",
    () => true,
    () => {
      const next = !expertMode();
      setExpertMode(next);
      setStudioExpertMode(next);
    },
  );

  return (
    <div
      aria-label="Studio status bar"
      class="grid h-full w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3"
      role="region"
    >
      <h1 class="sr-only">LiSCA Studio</h1>
      <Show when={!agentActive()}>
        <div class="flex min-w-0 items-center gap-2">
          <StudioPageTaskCenter />
          <Show when={props.showExpert}>
            <StudioExpertToggle />
          </Show>
        </div>
        <span
          aria-hidden="true"
          class="pointer-events-none text-xs font-semibold uppercase tracking-[0.2em] text-foreground"
        >
          Studio
        </span>
        <div class="flex items-center justify-end gap-2">
          <ConnectionStatus state={server.state} onRetry={server.retry} />
          <StudioSettings />
          <ShellThemeToggle class="size-7" />
        </div>
      </Show>
      <AgentActivity
        onSessionsChange={(sessions) => {
          setAgentActive(sessions.length > 0);
          setAgentSessions(sessions);
        }}
      />
      <StudioAgentNavigation sessions={agentSessions()} />
    </div>
  );
}
