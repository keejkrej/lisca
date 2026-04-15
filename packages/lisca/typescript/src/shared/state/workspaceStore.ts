import { createStore } from "zustand/vanilla";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface WorkspaceStoreState {
  workspacePath: string | null;
}

const LAST_WORKSPACE_KEY = "view.lastWorkspace";
const LAST_ROOT_KEY = "view.lastRoot";

function resolveStorage(): StorageLike | null {
  if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
  return null;
}

function readStoredWorkspacePath(storage: StorageLike | null): string | null {
  return storage?.getItem(LAST_WORKSPACE_KEY) ?? storage?.getItem(LAST_ROOT_KEY) ?? null;
}

function persistWorkspacePath(storage: StorageLike | null, workspacePath: string | null) {
  if (!storage) return;
  if (workspacePath) {
    storage.setItem(LAST_WORKSPACE_KEY, workspacePath);
  } else {
    storage.removeItem(LAST_WORKSPACE_KEY);
  }
  storage.removeItem(LAST_ROOT_KEY);
}

export const workspaceStore = createStore<WorkspaceStoreState>(() => ({
  workspacePath: readStoredWorkspacePath(resolveStorage()),
}));

export function setWorkspacePath(workspacePath: string | null) {
  persistWorkspacePath(resolveStorage(), workspacePath);
  workspaceStore.setState((state) => ({ ...state, workspacePath }));
}
