import type { HostListDirectoryResult } from "@lisca/contracts";
export type HostFilePickerMode =
  | "workspace"
  | "folder"
  | "nd2_file"
  | "czi_file"
  | "assay_json_file";

export type HostFilePickerOperations = {
  listDirectory(path: string | null): Promise<HostListDirectoryResult>;
  userHomeDirectory(): Promise<string>;
};
