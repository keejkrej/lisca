export {
  AppShell,
  AppShellDock,
  AppShellMain,
  AppShellMainColumn,
  AppShellMainScroll,
  AppShellTopBar,
  ShellLayoutProvider,
  ShellLayoutReceives,
  ShellPanelToggle,
  ShellPortraitPanelControls,
  type AppShellCompound,
  type AppShellOptions,
} from "./layout/shell";
export {
  ShellNavbar,
  type ShellNavbarAlignerOptions,
  type ShellNavbarAlignerProps,
  type ShellNavbarAnnotatorOptions,
  type ShellNavbarAnnotatorProps,
  type ShellNavbarCompound,
  type ShellNavbarOptions,
  type ShellNavbarProps,
} from "./chrome/navbar";
export {
  ShellAgentActivity,
  ShellAgentActivityEvents,
  ShellWorkspaceControlModeSchema,
  ShellWorkspaceControlOperationSchema,
  ShellWorkspaceControlSessionSchema,
  type ShellWorkspaceControlMode,
  type ShellWorkspaceControlOperation,
  type ShellWorkspaceControlSession,
} from "./chrome/agent-activity";
export { ConnectionStatus, type ConnectionState } from "./chrome/connection-status";
export {
  QUICK_GUIDE_TOPICS,
  QuickGuideTopicIdSchema,
  ShellHelpDialog,
  type QuickGuideTopicId,
} from "./chrome/help-dialog";
export {
  ShellSettingsDialog,
  type ShellSettingsDialogOptions,
  type ShellSettingsDialogProps,
} from "./chrome/settings-dialog";
export { DesktopUpdateSettings, StartupUpdateCheck } from "./chrome/update-settings";
export {
  ShellThemeModeSchema,
  ShellThemeProvider,
  ShellThemeReceives,
  ShellThemeSharedSchema,
  ShellThemeToggle,
  type ShellThemeMode,
  type ShellThemeShared,
} from "./theme/shell-theme";
export { dockToolLabel, dockToolShortcuts, type DockToolAction } from "@lisca/ui-headless/dock";
export {
  keyboardShortcutsSubscription,
  type KeyboardShortcut,
  type KeyboardShortcutBinding,
  type ShortcutModifiers,
} from "./shortcuts/use-keyboard-shortcuts";
export { ViewportCard, type ViewportCardOptions } from "./layout/viewport-card";
export { StageCanvas, type StageCanvasOptions } from "./layout/stage-canvas";
export { FrameAspectPanel, type FrameAspectPanelOptions } from "./layout/frame-aspect-panel";
export {
  ConnectionStateSchema,
  hasEmbeddedBackend,
  ShellServerProbe,
  ShellServerProvider,
  ShellServerReceives,
  ShellServerSharedSchema,
  type ShellServer,
  type ShellServerShared,
} from "./server/shell-server";
export {
  ShellWorkspaceProvider,
  ShellWorkspaceReceives,
  ShellWorkspaceSharedSchema,
  type ShellWorkspace,
} from "./workspace/workspace";
export {
  WorkSessionPickerDialog,
  type WorkSessionPickerDialogOptions,
  type WorkSessionPickerDialogProps,
} from "./workspace/work-session-picker-dialog";
