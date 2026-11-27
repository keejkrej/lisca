import { readWorkSessions, type LiscaAppId, type WorkSession } from "./work-session";

export type { WorkSession } from "./work-session";

export type WorkSessionGateState = {
  ready: boolean;
  open: boolean;
  sessions: WorkSession[];
};

export type WorkSessionGateOptions = {
  /** Skip the resume picker when the app already restored workspace/source (e.g. sessionStorage). */
  skipResumePicker?: boolean | undefined;
};

export type WorkSessionGateController = {
  getState: () => WorkSessionGateState;
  subscribe: (listener: (state: WorkSessionGateState) => void) => () => void;
  restoreSession: (session: WorkSession) => void;
  startNewSession: () => void;
};

export function createWorkSessionGate(
  appId: LiscaAppId,
  onRestore: (session: WorkSession) => void | Promise<void>,
  options?: WorkSessionGateOptions,
): WorkSessionGateController {
  const skipResumePicker = options?.skipResumePicker ?? false;
  const sessions = readWorkSessions(appId);
  let state: WorkSessionGateState = {
    ready: sessions.length === 0 || skipResumePicker,
    open: sessions.length > 0 && !skipResumePicker,
    sessions,
  };
  let restored = false;
  const listeners = new Set<(next: WorkSessionGateState) => void>();

  const finish = () => {
    state = { ...state, open: false, ready: true };
    for (const listener of listeners) listener(state);
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    restoreSession(session) {
      if (restored) return;
      restored = true;
      void Promise.resolve(onRestore(session)).finally(finish);
    },
    startNewSession() {
      restored = true;
      finish();
    },
  };
}
