import type { AlignerSource } from "@lisca/contracts";
import {
  getLiscaActiveServerAddress,
  LISCA_APP_DEFAULT_PORTS,
  parseLiscaServerAddress,
  readLiscaActiveServerForApp,
  writeLiscaActiveServerForApp,
  type LiscaAppId,
} from "@lisca/utils";
import {
  liscaLocalStorage,
  liscaSessionStorage,
  readStorageJson,
  writeStorageJson,
} from "@lisca/storage";

export type { LiscaAppId };
export { LISCA_APP_DEFAULT_PORTS };

export type WorkSession = {
  id: string;
  server: string;
  workspacePath?: string;
  assayJsonPath?: string;
  source?: AlignerSource | null;
  label?: string;
  lastOpenedAt: string;
  snapshot?: unknown;
};

const WORK_SESSIONS_CAP = 20;

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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

export function writePersistedActiveServerAddress(appId: LiscaAppId, address: string | null): void {
  writeLiscaActiveServerForApp(appId, address);
}

function pathLabel(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts.at(-1) ?? path;
}

export function studioAssayJsonPathForSaveTo(saveTo: string): string {
  return `${saveTo.replace(/\/$/, "")}/assay.json`;
}

export function isValidWorkSession(appId: LiscaAppId, session: WorkSession): boolean {
  if (appId === "aligner") {
    return Boolean(session.workspacePath?.trim() && session.source);
  }
  if (appId === "annotator") {
    return Boolean(session.workspacePath?.trim());
  }
  if (appId === "studio") {
    return Boolean(session.assayJsonPath?.trim());
  }
  return false;
}

function sessionIdentity(appId: LiscaAppId, session: WorkSession): string {
  if (appId === "studio") {
    return JSON.stringify({
      server: session.server,
      assayJsonPath: session.assayJsonPath ?? null,
    });
  }
  if (appId === "aligner") {
    return JSON.stringify({
      server: session.server,
      workspacePath: session.workspacePath ?? null,
      source: session.source ?? null,
    });
  }
  return JSON.stringify({
    server: session.server,
    workspacePath: session.workspacePath ?? null,
  });
}

export function readWorkSessions(appId: LiscaAppId): WorkSession[] {
  migrateLegacySession(appId);
  const sessions =
    readStorageJson<WorkSession[]>(liscaLocalStorage(), workSessionsKey(appId)) ?? [];
  return sessions.filter((session) => isValidWorkSession(appId, session));
}

export function writeWorkSessions(appId: LiscaAppId, sessions: WorkSession[]): void {
  writeStorageJson(liscaLocalStorage(), workSessionsKey(appId), sessions);
}

export function sessionsForServer(sessions: WorkSession[], serverKey: string): WorkSession[] {
  return sessions.filter((session) => session.server === serverKey);
}

export function touchWorkSession(
  appId: LiscaAppId,
  entry: {
    server: string;
    workspacePath?: string;
    assayJsonPath?: string;
    source?: AlignerSource | null;
    label?: string;
    snapshot?: unknown;
  },
): WorkSession | null {
  const workspacePath = entry.workspacePath?.trim() || undefined;
  const assayJsonPath = entry.assayJsonPath?.trim() || undefined;

  if (appId === "aligner") {
    if (!workspacePath || !entry.source) return null;
  } else if (appId === "annotator") {
    if (!workspacePath) return null;
  } else if (appId === "studio") {
    if (!assayJsonPath) return null;
  }

  const now = new Date().toISOString();
  const draft: WorkSession = {
    id: generateId(),
    server: entry.server,
    workspacePath,
    assayJsonPath,
    source: appId === "aligner" ? (entry.source ?? null) : (entry.source ?? null),
    label:
      entry.label ??
      (appId === "studio" && assayJsonPath
        ? pathLabel(assayJsonPath)
        : workspacePath
          ? pathLabel(workspacePath)
          : undefined),
    lastOpenedAt: now,
    snapshot: entry.snapshot,
  };
  const identity = sessionIdentity(appId, draft);
  const sessions = readWorkSessions(appId).filter(
    (session) => sessionIdentity(appId, session) !== identity,
  );
  const updated = [draft, ...sessions].slice(0, WORK_SESSIONS_CAP);
  writeWorkSessions(appId, updated);
  return draft;
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
    const legacy = readStorageJson<{
      state?: { workspacePath: string | null; source: AlignerSource | null };
      workspacePath?: string | null;
      source?: AlignerSource | null;
    }>(storage, "lisca-aligner-session");
    if (legacy?.state) return;
    if (legacy?.workspacePath && legacy.source) {
      writeStorageJson(storage, "lisca-aligner-session", {
        state: {
          workspacePath: legacy.workspacePath,
          source: legacy.source,
        },
      });
      touchWorkSession(appId, {
        server,
        workspacePath: legacy.workspacePath,
        source: legacy.source,
      });
    }
    return;
  }
  if (appId === "annotator") {
    const legacy = readStorageJson<{
      state?: { workspacePath: string | null };
      workspacePath?: string | null;
    }>(storage, "lisca-annotator-session");
    if (legacy?.state) return;
    if (legacy?.workspacePath) {
      writeStorageJson(storage, "lisca-annotator-session", {
        state: { workspacePath: legacy.workspacePath },
      });
      touchWorkSession(appId, { server, workspacePath: legacy.workspacePath });
    }
  }
}

export function touchAlignerWorkSessionFromState(state: {
  workspacePath: string | null;
  source: AlignerSource | null;
}): void {
  if (!state.workspacePath?.trim() || !state.source) return;
  touchWorkSession("aligner", {
    server: currentServerKey("aligner"),
    workspacePath: state.workspacePath,
    source: state.source,
  });
}

export function touchAnnotatorWorkSessionFromState(state: { workspacePath: string | null }): void {
  if (!state.workspacePath?.trim()) return;
  touchWorkSession("annotator", {
    server: currentServerKey("annotator"),
    workspacePath: state.workspacePath,
  });
}

export function touchStudioWorkSessionFromAssayPath(assayJsonPath: string, label?: string): void {
  const trimmed = assayJsonPath.trim();
  if (!trimmed) return;
  touchWorkSession("studio", {
    server: currentServerKey("studio"),
    assayJsonPath: trimmed,
    label,
  });
}
