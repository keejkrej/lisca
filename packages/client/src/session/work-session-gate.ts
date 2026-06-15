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

export function useWorkSessionGate(
  appId: LiscaAppId,
  onRestore: (session: WorkSession) => void | Promise<void>,
): WorkSessionGateState {
  const serverKey = currentServerKey(appId);
  const sessions = sessionsForServer(readWorkSessions(appId), serverKey);
  const [ready, setReady] = useState(sessions.length === 0);
  const [open, setOpen] = useState(sessions.length > 0);
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
  children: (gate: WorkSessionGateState) => ReactNode;
};

export function WorkSessionBootstrap({ appId, onRestore, children }: WorkSessionBootstrapProps) {
  const gate = useWorkSessionGate(appId, onRestore);
  return children(gate);
}

export function persistActiveServer(appId: UtilsAppId, address: string | null): void {
  persistLiscaActiveServer(appId, address);
}
