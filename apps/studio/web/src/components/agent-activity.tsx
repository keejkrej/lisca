import type { LiscaWorkspaceControl } from "@lisca/client/desktop";
import { ShellAgentActivity } from "@lisca/ui/shell";

export function AgentActivity(props: {
  onSessionsChange?: (sessions: LiscaWorkspaceControl[]) => void;
}) {
  return (
    <ShellAgentActivity
      onSessionsChange={(sessions) => props.onSessionsChange?.(sessions as LiscaWorkspaceControl[])}
    />
  );
}
