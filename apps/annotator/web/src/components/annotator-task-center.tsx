import {
  createTaskCenterGateway,
  subscribeTaskCenterOperations,
} from "@lisca/client/session/task-center";
import { TaskCenter } from "@lisca/ui/shell";

import { annotatorClient } from "../api/annotator-port";

const gateway = createTaskCenterGateway(annotatorClient);

export function AnnotatorTaskCenter() {
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
