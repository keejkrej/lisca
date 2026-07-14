import {
  createTaskCenterGateway,
  subscribeTaskCenterOperations,
} from "@lisca/client/session/task-center";
import { TaskCenter } from "@lisca/ui/shell";

import { alignerClient } from "../api/aligner-port";

const gateway = createTaskCenterGateway(alignerClient);

export function AlignerTaskCenter() {
  return (
    <TaskCenter
      gateway={gateway}
      subscribe={({ onSnapshot, onError }) =>
        subscribeTaskCenterOperations({ gateway, onSnapshot, onError })
      }
    />
  );
}
