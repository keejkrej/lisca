import type { HostPort } from "@lisca/client/ports/types";
import { runClientEffect } from "@lisca/client/runtime";
import type { HostFilePickerOperations } from "@lisca/ui-headless/host";

/**
 * Adapt an Effect-based host port into the Promise-based operations the UI file
 * pickers expect. This is the production adapter; tests can supply an in-memory
 * fake satisfying `HostFilePickerOperations` directly.
 */
export function toHostFilePickerOperations(
  port: Pick<HostPort, "listDirectory" | "userHomeDirectory" | "connectSmb" | "disconnectSmb">,
): HostFilePickerOperations {
  return {
    listDirectory: (path) => runClientEffect(port.listDirectory(path)),
    userHomeDirectory: () => runClientEffect(port.userHomeDirectory()),
    connectSmb: (request) => runClientEffect(port.connectSmb(request)),
    disconnectSmb: (sessionId) => runClientEffect(port.disconnectSmb(sessionId)),
  };
}
