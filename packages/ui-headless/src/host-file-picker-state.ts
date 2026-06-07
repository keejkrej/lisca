import {
  DEFAULT_SMB_SOURCE_URL,
  type HostFilePickerMode,
  type HostFsEntry,
  type HostListDirectoryResult,
} from "@lisca/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import type { HostFilePickerOperations } from "./host.ts";

function pathExtLower(name: string): string {
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) return "";
  return name.slice(index).toLowerCase();
}

export function fileMatchesMode(mode: HostFilePickerMode, entry: HostFsEntry): boolean {
  if (entry.isDirectory) return false;
  const ext = pathExtLower(entry.name);
  if (mode === "nd2_file") return ext === ".nd2";
  if (mode === "czi_file") return ext === ".czi";
  if (mode === "assay_json_file") return ext === ".json";
  return false;
}

export function isDirectoryMode(mode: HostFilePickerMode): boolean {
  return mode === "workspace" || mode === "folder";
}

export type UseHostFilePickerStateOptions = {
  open: boolean;
  mode: HostFilePickerMode;
  hostPort: HostFilePickerOperations;
  onOpenChange: (open: boolean) => void;
  onPickDirectory: (path: string) => void;
  onPickFile: (path: string) => void;
};

export function useHostFilePickerState(options: UseHostFilePickerStateOptions) {
  const { open, mode, hostPort, onOpenChange, onPickDirectory, onPickFile } = options;
  const showSmb = mode !== "workspace";
  const [list, setList] = useState<HostListDirectoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<HostFsEntry | null>(null);
  const [useSmb, setUseSmb] = useState(false);
  const [smbUrl, setSmbUrl] = useState(DEFAULT_SMB_SOURCE_URL);
  const [smbUsername, setSmbUsername] = useState("");
  const [smbPassword, setSmbPassword] = useState("");
  const [smbSessionId, setSmbSessionId] = useState<string | null>(null);
  const [smbRootPath, setSmbRootPath] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const smbSessionIdRef = useRef<string | null>(null);

  const disconnectSmb = useCallback(async () => {
    const sessionId = smbSessionIdRef.current;
    if (!sessionId) return;
    smbSessionIdRef.current = null;
    setSmbSessionId(null);
    setSmbRootPath(null);
    try {
      await hostPort.disconnectSmb(sessionId);
    } catch {
      // ignore disconnect errors
    }
  }, [hostPort]);

  const loadPath = useCallback(
    async (path: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const result = await hostPort.listDirectory(path);
        setList(result);
        setSelectedFile(null);
      } catch (cause) {
        setList(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setLoading(false);
      }
    },
    [hostPort],
  );

  const connectSmbShare = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      await disconnectSmb();
      const response = await hostPort.connectSmb({
        url: smbUrl.trim(),
        username: smbUsername.trim(),
        password: smbPassword,
      });
      smbSessionIdRef.current = response.sessionId;
      setSmbSessionId(response.sessionId);
      setSmbRootPath(response.rootPath);
      await loadPath(response.rootPath);
    } catch (cause) {
      setList(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setConnecting(false);
    }
  }, [disconnectSmb, hostPort, loadPath, smbPassword, smbUrl, smbUsername]);

  useEffect(() => {
    if (!open) {
      void disconnectSmb();
      setUseSmb(false);
      setSmbPassword("");
      return;
    }
    if (useSmb && smbRootPath) {
      void loadPath(smbRootPath);
      return;
    }
    if (!useSmb) {
      void loadPath(null);
    }
  }, [open, useSmb, smbRootPath, loadPath, disconnectSmb]);

  const dirMode = isDirectoryMode(mode);
  const smbActive = useSmb && Boolean(smbSessionId);
  const canGoUp = Boolean(list?.path) && (smbActive ? Boolean(list?.parent) : true);
  const locationLabel = list?.path ?? null;
  const browseReady = smbActive || !useSmb;

  const goUp = () => {
    if (!list) return;
    if (list.parent) {
      void loadPath(list.parent);
    } else if (list.path && !smbActive) {
      void loadPath(null);
    }
  };

  const goHome = async () => {
    if (smbActive && smbRootPath) {
      await loadPath(smbRootPath);
      return;
    }
    try {
      const home = await hostPort.userHomeDirectory();
      await loadPath(home);
    } catch (cause) {
      setList(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const navigateToEntry = (entry: HostFsEntry) => {
    if (entry.isDirectory) void loadPath(entry.path);
  };

  const confirmDirectory = () => {
    if (!list?.path) return;
    onPickDirectory(list.path);
    onOpenChange(false);
  };

  const confirmFile = () => {
    if (!selectedFile || selectedFile.isDirectory || !fileMatchesMode(mode, selectedFile)) return;
    onPickFile(selectedFile.path);
    onOpenChange(false);
  };

  const handleRowClick = (entry: HostFsEntry) => {
    if (dirMode && entry.isDirectory) {
      navigateToEntry(entry);
      return;
    }
    if (entry.isDirectory) {
      navigateToEntry(entry);
      return;
    }
    if (fileMatchesMode(mode, entry)) {
      setSelectedFile(entry);
    }
  };

  const handleRowDoubleClick = (entry: HostFsEntry) => {
    if (entry.isDirectory) {
      navigateToEntry(entry);
      return;
    }
    if (!dirMode && fileMatchesMode(mode, entry)) {
      onPickFile(entry.path);
      onOpenChange(false);
    }
  };

  const handleSmbToggle = (pressed: boolean) => {
    setUseSmb(pressed);
    setError(null);
    setList(null);
    setSelectedFile(null);
    if (!pressed) {
      void disconnectSmb();
    }
  };

  return {
    showSmb,
    list,
    loading,
    error,
    selectedFile,
    useSmb,
    smbUrl,
    smbUsername,
    smbPassword,
    connecting,
    dirMode,
    smbActive,
    canGoUp,
    locationLabel,
    browseReady,
    setSmbUrl,
    setSmbUsername,
    setSmbPassword,
    goUp,
    goHome,
    confirmDirectory,
    confirmFile,
    handleRowClick,
    handleRowDoubleClick,
    handleSmbToggle,
    connectSmbShare,
    fileMatchesMode: (entry: HostFsEntry) => fileMatchesMode(mode, entry),
  };
}
