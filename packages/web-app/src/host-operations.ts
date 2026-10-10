import { liscaDesktopBridge } from "@lisca/client/desktop";
import type { HostPort } from "@lisca/client/ports/types";
import { runClientEffect } from "@lisca/client/runtime";
import type { HostFilePickerOperations, HostNativePickerRequest } from "@lisca/utils";

/**
 * Adapt an Effect-based host port into the Promise-based operations the UI file
 * pickers expect. This is the production adapter; tests can supply an in-memory
 * fake satisfying `HostFilePickerOperations` directly.
 */
export function toHostFilePickerOperations(
  port: Pick<HostPort, "listDirectory" | "userHomeDirectory" | "createDirectory" | "windowsDrives">,
): HostFilePickerOperations {
  const pickPath = liscaDesktopBridge()?.pickPath;
  return {
    listDirectory: (path) => runClientEffect(port.listDirectory(path)),
    userHomeDirectory: () => runClientEffect(port.userHomeDirectory()),
    createDirectory: (parentPath, name) =>
      runClientEffect(port.createDirectory(parentPath, name)).then((result) => result.path),
    windowsDrives: () => runClientEffect(port.windowsDrives()),
    ...(pickPath
      ? {
          openNativePicker: (request: HostNativePickerRequest) =>
            pickPath({
              directory: request.directory,
              ...(request.directoryPath ? { directoryPath: request.directoryPath } : {}),
              extensions: request.extensions,
            }),
        }
      : {}),
  };
}
