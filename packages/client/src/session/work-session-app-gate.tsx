import type { LiscaAppId } from "@lisca/utils";
import { Show, type Component, type JSX } from "solid-js";

import {
  toWorkSessionPickerItems,
  type WorkSessionPickerItem,
} from "@lisca/ui-headless/work-session-picker";

import {
  WorkSessionBootstrap,
  type WorkSession,
  type WorkSessionGateOptions,
} from "./work-session-gate";

export type WorkSessionPickerDialogComponent = Component<{
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
  children?: JSX.Element;
};

export function WorkSessionAppGate(props: WorkSessionAppGateProps) {
  return (
    <WorkSessionBootstrap
      appId={props.appId}
      gateOptions={props.gateOptions}
      onRestore={props.onRestore}
    >
      {(gate) => (
        <>
          <Show when={gate().ready}>{props.children}</Show>
          <props.PickerDialog
            appId={props.appId}
            open={gate().open}
            sessions={toWorkSessionPickerItems(props.appId, gate().sessions)}
            onRestore={(sessionId) => {
              const session = gate().sessions.find((entry) => entry.id === sessionId);
              if (session) gate().restoreSession(session);
            }}
            onStartNew={gate().startNewSession}
          />
        </>
      )}
    </WorkSessionBootstrap>
  );
}