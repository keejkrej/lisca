import type { HostListDirectoryResult } from "@lisca/contracts";

export type HostFilePickerOperations = {
  listDirectory(path: string | null): Promise<HostListDirectoryResult>;
};
