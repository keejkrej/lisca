import type { ReactNode } from "react";
import { useRef, useState } from "react";
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
): WorkSessionGateState {
  const skipResumePicker = options?.skipResumePicker ?? false;
  const serverKey = currentServerKey(appId);
  const sessions = sessionsForServer(readWorkSessions(appId), serverKey);
  const [ready, setReady] = useState(sessions.length === 0 || skipResumePicker);
  const [open, setOpen] = useState(sessions.length > 0 && !skipResumePicker);
  const restoredRef = useRef(false);

  const finish = () => {
    setOpen(false);
    setReady(true);
  };

  return {
    ready,
    open,
    sessions,
    restoreSession: (session) => {
      if (restoredRef.current) return;
      restoredRef.current = true;
      void Promise.resolve(onRestore(session)).finally(finish);
    },
    startNewSession: () => {
      restoredRef.current = true;
      finish();
    },
  };
}

export type WorkSessionBootstrapProps = {
  appId: LiscaAppId;
  onRestore: (session: WorkSession) => void | Promise<void>;
  gateOptions?: WorkSessionGateOptions;
  children: (gate: WorkSessionGateState) => ReactNode;
};

export function WorkSessionBootstrap({
  appId,
  onRestore,
  gateOptions,
  children,
}: WorkSessionBootstrapProps) {
  const gate = useWorkSessionGate(appId, onRestore, gateOptions);
  return children(gate);
}

export function persistActiveServer(appId: UtilsAppId, address: string | null): void {
  persistLiscaActiveServer(appId, address);
}
