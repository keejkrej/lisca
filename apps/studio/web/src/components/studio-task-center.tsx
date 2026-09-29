import {
  createTaskCenterGateway,
  subscribeTaskCenterOperations,
} from "@lisca/client/session/task-center";
import { TaskCenter } from "@lisca/ui/shell";
import { useRouterState } from "@tanstack/solid-router";
import { Show } from "solid-js";

import { studioClient } from "../api/studio-port";
import {
  filterStudioTaskOperations,
  studioTaskCenterCopy,
  studioTaskScopeForPath,
} from "./studio-task-scope";

const gateway = createTaskCenterGateway(studioClient);

export function StudioTaskCenter(props: { scope: "crop" | "analysis" }) {
  const copy = () => studioTaskCenterCopy(props.scope);
  return (
    <TaskCenter
      appearance="status-link"
      description={copy().description}
      emptyMessage={copy().emptyMessage}
      emptyTitle={copy().emptyTitle}
      gateway={gateway}
      label={copy().label}
      title={copy().title}
      subscribe={({ onSnapshot, onError }) =>
        subscribeTaskCenterOperations({
          gateway,
          onError,
          onSnapshot: (snapshot) => onSnapshot(filterStudioTaskOperations(snapshot, props.scope)),
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
