import type { HostPort } from "@lisca/client/ports/types";
import { runClientEffect } from "@lisca/client/runtime";
import type { HostFilePickerOperations } from "@lisca/ui-native";

export function toHostFilePickerOperations(
  port: Pick<HostPort, "listDirectory" | "userHomeDirectory" | "connectSmb" | "disconnectSmb">,
): HostFilePickerOperations {
  return {
    listDirectory: (path) => runClientEffect(port.listDirectory(path ?? null)),
    userHomeDirectory: () => runClientEffect(port.userHomeDirectory()),
    connectSmb: (request) =>
      runClientEffect(
        port.connectSmb({
          url: request.url,
          username: request.username ?? "",
          password: request.password ?? "",
        }),
      ),
    disconnectSmb: (sessionId) => runClientEffect(port.disconnectSmb(sessionId)),
  };
}
