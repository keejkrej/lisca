import type { LiscaAppId } from "@lisca/utils";

export type WorkSessionPickerItem = {
  id: string;
  label: string;
  path: string;
  lastOpenedAt: string;
};

export type WorkSessionPickerState = {
  open: boolean;
  items: WorkSessionPickerItem[];
};

export function useWorkSessionPickerState(
  open: boolean,
  items: WorkSessionPickerItem[],
): WorkSessionPickerState {
  return {
    open,
    items,
  };
}

export function formatWorkSessionWhen(lastOpenedAt: string): string {
  const parsed = Date.parse(lastOpenedAt);
  if (Number.isNaN(parsed)) return lastOpenedAt;
  return new Date(parsed).toLocaleString();
}

export function workSessionPickerDescription(appId: LiscaAppId): string {
  if (appId === "studio") {
    return "Pick a recent assay.json for this server, or start fresh.";
  }
  if (appId === "aligner") {
    return "Pick a recent workspace and source for this server, or start fresh.";
  }
  return "Pick a recent workspace for this server, or start fresh.";
}

export function toWorkSessionPickerItems(
  appId: LiscaAppId,
  sessions: Array<{
    id: string;
    label?: string;
    workspacePath?: string;
    assayJsonPath?: string;
    lastOpenedAt: string;
  }>,
): WorkSessionPickerItem[] {
  return sessions.map((session) => ({
    id: session.id,
    label:
      session.label ??
      (appId === "studio"
        ? (session.assayJsonPath ?? "Assay")
        : (session.workspacePath ?? "Workspace")),
    path: appId === "studio" ? (session.assayJsonPath ?? "") : (session.workspacePath ?? ""),
    lastOpenedAt: session.lastOpenedAt,
  }));
}
