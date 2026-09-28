import { liscaLocalStorage, readStorageJson, writeStorageJson } from "@lisca/utils";

export type CropRecoveryRecord = {
  requestId: string;
  terminalAcknowledged: boolean;
};

function recoveryKey(workspacePath: string): string {
  return `lisca.cropRecovery.${encodeURIComponent(workspacePath)}`;
}

export function readCropRecovery(workspacePath: string): CropRecoveryRecord | null {
  const record = readStorageJson<CropRecoveryRecord>(
    liscaLocalStorage(),
    recoveryKey(workspacePath),
  );
  return record && typeof record.requestId === "string" ? record : null;
}

export function rememberCropRecovery(workspacePath: string, requestId: string): void {
  writeStorageJson(liscaLocalStorage(), recoveryKey(workspacePath), {
    requestId,
    terminalAcknowledged: false,
  } satisfies CropRecoveryRecord);
}

export function acknowledgeCropRecovery(workspacePath: string, requestId: string): void {
  const current = readCropRecovery(workspacePath);
  if (current?.requestId !== requestId) return;
  writeStorageJson(liscaLocalStorage(), recoveryKey(workspacePath), {
    ...current,
    terminalAcknowledged: true,
  } satisfies CropRecoveryRecord);
}
