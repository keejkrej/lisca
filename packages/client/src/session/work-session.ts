import type { AlignerSource } from "@lisca/contracts";
import {
  getLiscaActiveServerAddress,
  LISCA_APP_DEFAULT_PORTS,
  parseLiscaServerAddress,
  readLiscaActiveServerForApp,
  writeLiscaActiveServerForApp,
  type LiscaAppId,
} from "@lisca/utils";
import { liscaLocalStorage, liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/storage";

export type { LiscaAppId };
export { LISCA_APP_DEFAULT_PORTS };

export type WorkSession = {
  id: string;
  server: string;
  workspacePath: string;
  source?: AlignerSource | null;
  label?: string;
  lastOpenedAt: string;
  snapshot?: unknown;
};

const WORK_SESSIONS_CAP = 20;

function workSessionsKey(appId: LiscaAppId): string {
  return `lisca.workSessions.${appId}`;
}

export function resolveServerKey(
  activeAddress: string | null | undefined,
  defaultPort: number,
): string {
  const trimmed = activeAddress?.trim();
  if (!trimmed) return "local";
  try {
    return parseLiscaServerAddress(trimmed, { defaultPort }).httpBaseUrl;
  } catch {
    return trimmed;
  }
}

export function readPersistedActiveServerAddress(appId: LiscaAppId): string | null {
  return readLiscaActiveServerForApp(appId);
}

export function writePersistedActiveServerAddress(
  appId: LiscaAppId,
  address: string | null,
): void {
  writeLiscaActiveServerForApp(appId, address);
}

export function readWorkSessions(appId: LiscaAppId): WorkSession[] {
  migrateLegacySession(appId);
  return readStorageJson<WorkSession[]>(liscaLocalStorage(), workSessionsKey(appId)) ?? [];
}

export function writeWorkSessions(appId: LiscaAppId, sessions: WorkSession[]): void {
  writeStorageJson(liscaLocalStorage(), workSessionsKey(appId), sessions);
}

export function sessionsForServer(sessions: WorkSession[], serverKey: string): WorkSession[] {
  return sessions.filter((session) => session.server === serverKey);
}

function sessionIdentity(session: Pick<WorkSession, "server" | "workspacePath" | "source">): string {
  return JSON.stringify({
    server: session.server,
    workspacePath: session.workspacePath,
    source: session.source ?? null,
  });
}

function workspaceLabel(workspacePath: string): string {
  const parts = workspacePath.split(/[/\\]/).filter(Boolean);
  return parts.at(-1) ?? workspacePath;
}

export function touchWorkSession(
  appId: LiscaAppId,
  entry: {
    server: string;
    workspacePath: string;
    source?: AlignerSource | null;
    label?: string;
    snapshot?: unknown;
  },
): WorkSession {
  const trimmedPath = entry.workspacePath.trim();
  if (!trimmedPath) {
    throw new Error("workspacePath is required to touch a work session");
  }
  const now = new Date().toISOString();
  const identity = sessionIdentity({
    server: entry.server,
    workspacePath: trimmedPath,
    source: entry.source ?? null,
  });
  const sessions = readWorkSessions(appId).filter(
    (session) => sessionIdentity(session) !== identity,
  );
  const next: WorkSession = {
    id: crypto.randomUUID(),
    server: entry.server,
    workspacePath: trimmedPath,
    source: entry.source ?? null,
    label: entry.label ?? workspaceLabel(trimmedPath),
    lastOpenedAt: now,
    snapshot: entry.snapshot,
  };
  const updated = [next, ...sessions].slice(0, WORK_SESSIONS_CAP);
  writeWorkSessions(appId, updated);
  return next;
}

export function removeWorkSession(appId: LiscaAppId, sessionId: string): void {
  writeWorkSessions(
    appId,
    readWorkSessions(appId).filter((session) => session.id !== sessionId),
  );
}

export function currentServerKey(appId: LiscaAppId): string {
  return resolveServerKey(
    getLiscaActiveServerAddress() ?? readPersistedActiveServerAddress(appId),
    LISCA_APP_DEFAULT_PORTS[appId],
  );
}

function migrateLegacySession(appId: LiscaAppId): void {
  const storage = liscaSessionStorage();
  const server = "local";
  if (appId === "aligner") {
    const legacy = readStorageJson<{ workspacePath: string | null; source: AlignerSource | null }>(
      storage,
      "lisca-aligner-session",
    );
    if (legacy?.workspacePath) {
      storage.removeItem("lisca-aligner-session");
      touchWorkSession(appId, {
        server,
        workspacePath: legacy.workspacePath,
        source: legacy.source,
      });
    }
    return;
  }
  if (appId === "annotator") {
    const legacy = readStorageJson<{ workspacePath: string | null }>(
      storage,
      "lisca-annotator-session",
    );
    if (legacy?.workspacePath) {
      storage.removeItem("lisca-annotator-session");
      touchWorkSession(appId, { server, workspacePath: legacy.workspacePath });
    }
    return;
  }
  if (appId === "studio") {
    const legacy = readStorageJson<{
      state?: { workspacePath: string | null; source: AlignerSource | null };
      workspacePath?: string | null;
      source?: AlignerSource | null;
    }>(storage, "lisca-studio-align-session");
    const session = legacy?.state ?? legacy;
    if (session?.workspacePath) {
      storage.removeItem("lisca-studio-align-session");
      touchWorkSession(appId, {
        server,
        workspacePath: session.workspacePath,
        source: session.source ?? null,
      });
    }
  }
}

export function touchAlignerWorkSessionFromState(state: {
  workspacePath: string | null;
  source: AlignerSource | null;
}): void {
  if (!state.workspacePath) return;
  touchWorkSession("aligner", {
    server: currentServerKey("aligner"),
    workspacePath: state.workspacePath,
    source: state.source,
  });
}

export function touchAnnotatorWorkSessionFromState(state: { workspacePath: string | null }): void {
  if (!state.workspacePath) return;
  touchWorkSession("annotator", {
    server: currentServerKey("annotator"),
    workspacePath: state.workspacePath,
  });
}

export function touchStudioWorkSessionFromState(state: {
  workspacePath: string | null;
  source: AlignerSource | null;
}): void {
  if (!state.workspacePath) return;
  touchWorkSession("studio", {
    server: currentServerKey("studio"),
    workspacePath: state.workspacePath,
    source: state.source,
  });
}
