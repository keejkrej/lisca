import { createStore } from "zustand/vanilla";

import {
  persistStoredString,
  readStoredStringWithFallback,
  resolveSessionStorage,
} from "./storage";

interface WorkspaceStoreState {
  workspacePath: string | null;
}

const LAST_WORKSPACE_KEY = "view.lastWorkspace";
const LAST_ROOT_KEY = "view.lastRoot";

function readStoredWorkspacePath(): string | null {
  return readStoredStringWithFallback(resolveSessionStorage(), LAST_WORKSPACE_KEY, LAST_ROOT_KEY);
}

export const workspaceStore = createStore<WorkspaceStoreState>(() => ({
  workspacePath: readStoredWorkspacePath(),
}));

export function setWorkspacePath(workspacePath: string | null) {
  persistStoredString(resolveSessionStorage(), LAST_WORKSPACE_KEY, workspacePath, LAST_ROOT_KEY);
  workspaceStore.setState((state) => ({ ...state, workspacePath }));
}
