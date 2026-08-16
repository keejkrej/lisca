import { createMemo, createSignal, type Accessor, type JSX } from "solid-js";
import {
  currentServerKey,
  readWorkSessions,
  sessionsForServer,
  type LiscaAppId,
  type WorkSession,
} from "./work-session";
import { persistLiscaActiveServer, type LiscaAppId as UtilsAppId } from "@lisca/utils";

export type { WorkSession } from "./work-session";

export type WorkSessionGateState = {
  ready: boolean;
  open: boolean;
  sessions: WorkSession[];
  restoreSession: (session: WorkSession) => void;
  startNewSession: () => void;
};

export type WorkSessionGateOptions = {
  /** Skip the resume picker when the app already restored workspace/source (e.g. sessionStorage). */
  skipResumePicker?: boolean;
};

export function useWorkSessionGate(
  appId: LiscaAppId,
  onRestore: (session: WorkSession) => void | Promise<void>,
  options?: WorkSessionGateOptions,
) {
  const skipResumePicker = options?.skipResumePicker ?? false;
  const serverKey = currentServerKey(appId);
  const sessions = sessionsForServer(readWorkSessions(appId), serverKey);
  const [ready, setReady] = createSignal(sessions.length === 0 || skipResumePicker);
  const [open, setOpen] = createSignal(sessions.length > 0 && !skipResumePicker);
  let restored = false;

  const finish = () => {
    setOpen(false);
    setReady(true);
  };

  return createMemo<WorkSessionGateState>(() => ({
    ready: ready(),
    open: open(),
    sessions,
    restoreSession: (session) => {
      if (restored) return;
      restored = true;
      void Promise.resolve(onRestore(session)).finally(finish);
    },
    startNewSession: () => {
      restored = true;
      finish();
    },
  }));
}

export type WorkSessionBootstrapProps = {
  appId: LiscaAppId;
  onRestore: (session: WorkSession) => void | Promise<void>;
  gateOptions?: WorkSessionGateOptions;
  children: (gate: Accessor<WorkSessionGateState>) => JSX.Element;
};

export function WorkSessionBootstrap(props: WorkSessionBootstrapProps) {
  const gate = useWorkSessionGate(props.appId, props.onRestore, props.gateOptions);
  return props.children(gate);
}

export function persistActiveServer(appId: UtilsAppId, address: string | null): void {
  persistLiscaActiveServer(appId, address);
}
