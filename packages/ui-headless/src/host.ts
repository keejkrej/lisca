import type {
  HostListDirectoryResult,
  SmbConnectRequest,
  SmbConnectResponse,
} from "@lisca/contracts";

export type HostFilePickerOperations = {
  listDirectory(path: string | null): Promise<HostListDirectoryResult>;
  userHomeDirectory(): Promise<string>;
  connectSmb(request: SmbConnectRequest): Promise<SmbConnectResponse>;
  disconnectSmb(sessionId: string): Promise<void>;
};
