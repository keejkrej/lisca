import type { LiscaAppId } from "@lisca/utils";
import type { ComponentType, ReactNode } from "react";

import {
  toWorkSessionPickerItems,
  type WorkSessionPickerItem,
} from "@lisca/ui-headless/work-session-picker";

import {
  WorkSessionBootstrap,
  type WorkSession,
  type WorkSessionGateOptions,
} from "./work-session-gate";

export type WorkSessionPickerDialogComponent = ComponentType<{
  appId: LiscaAppId;
  open: boolean;
  sessions: WorkSessionPickerItem[];
  onRestore: (sessionId: string) => void;
  onStartNew: () => void;
}>;

export type WorkSessionAppGateProps = {
  appId: LiscaAppId;
  PickerDialog: WorkSessionPickerDialogComponent;
  onRestore: (session: WorkSession) => void | Promise<void>;
  gateOptions?: WorkSessionGateOptions;
  children: ReactNode;
};

export function WorkSessionAppGate({
  appId,
  PickerDialog,
  onRestore,
  gateOptions,
  children,
}: WorkSessionAppGateProps) {
  return (
    <WorkSessionBootstrap appId={appId} gateOptions={gateOptions} onRestore={onRestore}>
      {(gate) => (
        <>
          {gate.ready ? children : null}
          <PickerDialog
            appId={appId}
            open={gate.open}
            sessions={toWorkSessionPickerItems(appId, gate.sessions)}
            onRestore={(sessionId) => {
              const session = gate.sessions.find((entry) => entry.id === sessionId);
              if (session) gate.restoreSession(session);
            }}
            onStartNew={gate.startNewSession}
          />
        </>
      )}
    </WorkSessionBootstrap>
  );
}
