export { AppShell, type AppShellCompound, ShellPanelToggle, useShellLayout } from "./layout/shell";
export {
  ShellNavbar,
  type ShellNavbarAlignerProps,
  type ShellNavbarAnnotatorProps,
  type ShellNavbarCompound,
  type ShellNavbarProps,
} from "./chrome/navbar";
export {
  ShellAgentActivity,
  type ShellWorkspaceControlMode,
  type ShellWorkspaceControlOperation,
  type ShellWorkspaceControlSession,
} from "./chrome/agent-activity";
export { ConnectionStatus, type ConnectionState } from "./chrome/connection-status";
export { QUICK_GUIDE_TOPICS, ShellHelpDialog, type QuickGuideTopicId } from "./chrome/help-dialog";
export { ShellSettingsDialog, type ShellSettingsDialogProps } from "./chrome/settings-dialog";
export { DesktopUpdateSettings, StartupUpdateCheck } from "./chrome/update-settings";
export {
  ShellThemeProvider,
  ShellThemeToggle,
  useShellTheme,
  type ShellThemeMode,
} from "./theme/shell-theme";
export { dockToolLabel, dockToolShortcuts, type DockToolAction } from "@lisca/ui-headless/dock";
export {
  useKeyboardShortcuts,
  type KeyboardShortcut,
  type ShortcutModifiers,
} from "./shortcuts/use-keyboard-shortcuts";
export { ViewportCard } from "./layout/viewport-card";
export { StageCanvas } from "./layout/stage-canvas";
export { FrameAspectPanel } from "./layout/frame-aspect-panel";
export { ShellServerProvider, useShellServer, type ShellServer } from "./server/shell-server";
export {
  ShellWorkspaceProvider,
  useShellWorkspace,
  type ShellWorkspace,
} from "./workspace/workspace";
export {
  WorkSessionPickerDialog,
  type WorkSessionPickerDialogProps,
} from "./workspace/work-session-picker-dialog";
