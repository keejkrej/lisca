import type {
  HostListDirectoryResult,
  SmbConnectRequest,
  SmbConnectResponse,
} from "@lisca/contracts";

/**
 * Promise-based host filesystem operations the UI needs. Apps adapt their
 * Effect-based host port into this interface, keeping `@lisca/ui` independent
 * of the IO boundary. Tests can satisfy it with an in-memory fake.
 */
export type HostFilePickerOperations = {
  listDirectory(path: string | null): Promise<HostListDirectoryResult>;
  userHomeDirectory(): Promise<string>;
  connectSmb(request: SmbConnectRequest): Promise<SmbConnectResponse>;
  disconnectSmb(sessionId: string): Promise<void>;
};
