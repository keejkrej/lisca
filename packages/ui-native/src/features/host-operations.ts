import type { HostFilePickerMode } from "@lisca/contracts";

export type HostFilePickerOperations = {
  listDirectory: (path?: string | null) => Promise<import("@lisca/contracts").HostListDirectoryResult>;
  userHomeDirectory: () => Promise<string>;
  connectSmb: (request: { url: string; username?: string; password?: string }) => Promise<{ sessionId: string; rootPath: string }>;
  disconnectSmb: (sessionId: string) => Promise<void>;
};

export type { HostFilePickerMode };
