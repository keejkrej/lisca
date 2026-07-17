import { liscaLocalStorage, readStorageJson, writeStorageJson } from "@lisca/utils";

export type CropRecoveryRecord = {
  requestId: string;
  terminalAcknowledged: boolean;
};

function recoveryKey(serverIdentity: string, workspacePath: string): string {
  return `lisca.cropRecovery.${encodeURIComponent(serverIdentity)}.${encodeURIComponent(workspacePath)}`;
}

export function readCropRecovery(
  serverIdentity: string,
  workspacePath: string,
): CropRecoveryRecord | null {
  const record = readStorageJson<CropRecoveryRecord>(
    liscaLocalStorage(),
    recoveryKey(serverIdentity, workspacePath),
  );
  return record && typeof record.requestId === "string" ? record : null;
}

export function rememberCropRecovery(
  serverIdentity: string,
  workspacePath: string,
  requestId: string,
): void {
  writeStorageJson(liscaLocalStorage(), recoveryKey(serverIdentity, workspacePath), {
    requestId,
    terminalAcknowledged: false,
  } satisfies CropRecoveryRecord);
}

export function acknowledgeCropRecovery(
  serverIdentity: string,
  workspacePath: string,
  requestId: string,
): void {
  const current = readCropRecovery(serverIdentity, workspacePath);
  if (current?.requestId !== requestId) return;
  writeStorageJson(liscaLocalStorage(), recoveryKey(serverIdentity, workspacePath), {
    ...current,
    terminalAcknowledged: true,
  } satisfies CropRecoveryRecord);
}
