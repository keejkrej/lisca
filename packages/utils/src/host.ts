import type { HostListDirectoryResult, HostWindowsDrivesResponse } from "@lisca/contracts";
export type HostFilePickerMode =
  | "workspace"
  | "folder"
  | "nd2_file"
  | "czi_file"
  | "assay_json_file";

export type HostNativePickerRequest = {
  directory: boolean;
  /** Folder the native dialog opens in. Null before the in-app list has loaded. */
  directoryPath: string | null;
  extensions: string[];
};

export type HostFilePickerOperations = {
  listDirectory(path: string | null): Promise<HostListDirectoryResult>;
  userHomeDirectory(): Promise<string>;
  createDirectory(parentPath: string, name: string): Promise<string>;
  /** Asks the filesystem host whether it is Windows, and for its drive letters. */
  windowsDrives(): Promise<HostWindowsDrivesResponse>;
  /**
   * Desktop-only native dialog. Absent in the browser, where a file input cannot
   * return a path on the host the picker is browsing.
   */
  openNativePicker?: (request: HostNativePickerRequest) => Promise<string | null>;
};
