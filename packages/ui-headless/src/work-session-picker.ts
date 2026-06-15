export type WorkSessionPickerItem = {
  id: string;
  label: string;
  workspacePath: string;
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

export function toWorkSessionPickerItems(
  sessions: Array<{
    id: string;
    label?: string;
    workspacePath: string;
    lastOpenedAt: string;
  }>,
): WorkSessionPickerItem[] {
  return sessions.map((session) => ({
    id: session.id,
    label: session.label ?? session.workspacePath,
    workspacePath: session.workspacePath,
    lastOpenedAt: session.lastOpenedAt,
  }));
}
