import type { HostPort } from "@lisca/client/ports/types";
import { runClientEffect } from "@lisca/client/runtime";
import type { HostFilePickerOperations } from "@lisca/ui-native";

export function toHostFilePickerOperations(
  port: Pick<HostPort, "listDirectory" | "userHomeDirectory">,
): HostFilePickerOperations {
  return {
    listDirectory: (path) => runClientEffect(port.listDirectory(path ?? null)),
    userHomeDirectory: () => runClientEffect(port.userHomeDirectory()),
  };
}
