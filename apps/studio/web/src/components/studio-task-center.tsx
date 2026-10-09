import {
  createTaskCenterGateway,
  subscribeTaskCenterTasks,
} from "@lisca/client/session/task-center";
import { TaskCenter } from "@lisca/ui/shell";
import { useRouterState } from "@tanstack/solid-router";
import { Show, createEffect, createSignal } from "solid-js";

import { studioClient } from "../api/studio-port";
import {
  CommandShortcutHint,
  commandShortcutKeys,
  useStudioCommandShortcut,
} from "../navigation/use-studio-command-shortcut";
import {
  clearStudioTaskCenterOpen,
  studioTaskCenterOpenIsHeld,
  studioTaskCenterOpenScope,
  studioTaskCenterRequestedAt,
} from "./studio-task-center-open";
import {
  filterStudioTasks,
  studioTaskCenterCopy,
  studioTaskScopeForPath,
} from "./studio-task-scope";

const gateway = createTaskCenterGateway(studioClient);

export function StudioTaskCenter(props: { scope: "crop" | "analysis" }) {
  const copy = () => studioTaskCenterCopy(props.scope);
  const [open, setOpen] = createSignal(false);
  createEffect(() => {
    if (studioTaskCenterOpenScope() === props.scope) setOpen(true);
  });
  const onOpenChange = (next: boolean) => {
    if (
      !next &&
      studioTaskCenterOpenScope() === props.scope &&
      studioTaskCenterOpenIsHeld(studioTaskCenterRequestedAt(), Date.now())
    ) {
      setOpen(true);
      return;
    }
    if (!next && studioTaskCenterOpenScope() === props.scope) clearStudioTaskCenterOpen();
    setOpen(next);
  };
  useStudioCommandShortcut(
    "tasks",
    () => true,
    () => setOpen((current) => !current),
  );
  return (
    <TaskCenter
      appearance="status-link"
      description={copy().description}
      emptyMessage={copy().emptyMessage}
      emptyTitle={copy().emptyTitle}
      gateway={gateway}
      label={copy().label}
      open={open()}
      shortcutHint={<CommandShortcutHint command="tasks" placement="inline" />}
      shortcutKeys={commandShortcutKeys("tasks")}
      title={copy().title}
      onOpenChange={onOpenChange}
      subscribe={({ onSnapshot, onError }) =>
        subscribeTaskCenterTasks({
          gateway,
          onError,
          onSnapshot: (snapshot) => onSnapshot(filterStudioTasks(snapshot, props.scope)),
        })
      }
    />
  );
}

export function StudioPageTaskCenter() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <Show when={studioTaskScopeForPath(pathname())} keyed>
      {(scope) => <StudioTaskCenter scope={scope} />}
    </Show>
  );
}
