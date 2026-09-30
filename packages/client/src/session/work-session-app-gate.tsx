import type { LiscaAppId } from "@lisca/utils";
import { createContext, Show, useContext, type Component, type JSX } from "solid-js";

import { toWorkSessionPickerItems, type WorkSessionPickerItem } from "@lisca/utils";

import { readWorkSessions } from "./work-session";
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
  /** Return `false` when the session could not be restored (e.g. missing source). */
  onRestore: (session: WorkSession) => void | boolean | Promise<void | boolean>;
  gateOptions?: WorkSessionGateOptions;
  children?: JSX.Element;
};

export type WorkSessionRecentItem = { path: string; label?: string };

export type WorkSessionRecents = {
  /** Recent sessions as file-picker recents, newest first (read fresh on each call). */
  items: () => WorkSessionRecentItem[];
  /** Restore the recent session at `path`; resolves false when there is none to restore. */
  restore: (path: string) => Promise<boolean>;
};

const WorkSessionRecentsContext = createContext<WorkSessionRecents>();

/** Recent work sessions for pickers that replace the startup resume dialog. */
export function useWorkSessionRecents(): WorkSessionRecents {
  const context = useContext(WorkSessionRecentsContext);
  if (!context) throw new Error("useWorkSessionRecents must be used within WorkSessionAppGate");
  return context;
}

function sessionPath(appId: LiscaAppId, session: WorkSession): string {
  return (appId === "studio" ? session.assayJsonPath : session.workspacePath)?.trim() ?? "";
}

export function WorkSessionAppGate(props: WorkSessionAppGateProps) {
  const recents: WorkSessionRecents = {
    items: () =>
      [...readWorkSessions(props.appId)]
        .sort((a, b) => Date.parse(b.lastOpenedAt) - Date.parse(a.lastOpenedAt))
        .map((session) => ({ path: sessionPath(props.appId, session), label: session.label }))
        .filter((item) => item.path !== ""),
    restore: async (path) => {
      const session = readWorkSessions(props.appId).find(
        (entry) => sessionPath(props.appId, entry) === path,
      );
      if (!session) return false;
      return (await props.onRestore(session)) !== false;
    },
  };

  return (
    <WorkSessionRecentsContext.Provider value={recents}>
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
    </WorkSessionRecentsContext.Provider>
  );
}
