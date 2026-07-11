export type SmartModelDownloadProgress = {
  progress: number;
  message: string;
  file?: string;
};

export type SmartModelDownloadState = {
  open: boolean;
  requiresDownload: boolean;
  progress: number;
  message: string;
  file?: string;
};

/** Optional readiness gate for browser providers that download models client-side. */
export type SmartModelGate = {
  isLoaded(): boolean;
  isCached(): Promise<boolean>;
};