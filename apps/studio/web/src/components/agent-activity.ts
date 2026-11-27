import type { Html } from "@effect/ui/html";
import { ShellAgentActivity, type ShellWorkspaceControlSession } from "@lisca/ui/shell";

export type AgentActivityOptions<M> = {
  readonly key?: string | undefined;
  readonly class?: string | undefined;
  readonly onSessionsChange?:
    | ((sessions: readonly ShellWorkspaceControlSession[]) => M | undefined)
    | undefined;
};

export function AgentActivity<M>(h: Html.H<M>, options?: AgentActivityOptions<M>) {
  return ShellAgentActivity(h, {
    ...(options?.key !== undefined ? { key: options.key } : {}),
    props: {
      ...(options?.class !== undefined ? { class: options.class } : {}),
    },
    onEmit: {
      SessionsChanged: ({ sessions }) => options?.onSessionsChange?.(sessions),
    },
  });
}
