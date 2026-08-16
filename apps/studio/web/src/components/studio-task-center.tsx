import {
  createTaskCenterGateway,
  subscribeTaskCenterOperations,
} from "@lisca/client/session/task-center";
import { TaskCenter } from "@lisca/ui/shell";

import { studioClient } from "../api/studio-port";

const gateway = createTaskCenterGateway(studioClient);

export function StudioTaskCenter() {
  return (
    <TaskCenter
      appearance="status-link"
      gateway={gateway}
      subscribe={({ onSnapshot, onError }) =>
        subscribeTaskCenterOperations({ gateway, onSnapshot, onError })
      }
    />
  );
}
