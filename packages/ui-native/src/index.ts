export { AppShell, ShellDock, ShellSidebar, type AppShellCompound } from "./shell/app-shell.tsx";
export { Button, DockButton, Section } from "./shell/buttons.tsx";
export type { ConnectionState } from "./state/use-shell-ws-probe.ts";
export { ConnectionStatus } from "./shell/connection-status.tsx";
export { DialogSurface, ModalScrim } from "./shell/modal.tsx";
export { ShellNavbar, type ShellNavbarProps, type ShellNavbarRouteItem } from "./shell/navbar.tsx";
export { Panel, Spinner } from "./shell/panel.tsx";
export { ServerAddressDialog, type ServerAddressDialogProps } from "./shell/server-address-dialog.tsx";
export { ViewportCard } from "./shell/viewport-card.tsx";

export { ShellServerProvider, useShellServer, type ShellServer } from "./state/shell-server.tsx";
export { ShellWorkspaceProvider, useShellWorkspace, type ShellWorkspace } from "./state/workspace.tsx";
export { useWsProbeForUrl } from "./state/use-shell-ws-probe.ts";
export { ShellThemeProvider, useShellTheme } from "./theme/shell-theme.tsx";
export type { ShellThemeMode } from "./theme/tokens.ts";
export { shellThemeColors } from "./theme/tokens.ts";

export { AlignCanvas, type AlignCanvasPointerEvent, type AlignCanvasProps } from "./features/align-canvas.tsx";
export {
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  type UseAlignCanvasGridHandlersOptions,
} from "./features/align-canvas-handlers.ts";
export { AnnotationCanvas, type AnnotationCanvasProps, type AnnotationTool } from "./features/annotation-canvas.tsx";
export { useCanvasResourceTransaction } from "./features/canvas-resource-transaction.ts";
export { useCanvasTransientStatus } from "./features/canvas-transient-status.ts";
export { CropProgressModal, type CropProgressModalProps } from "./features/crop-progress-modal.tsx";
export { FolderSourceParseModal, type FolderSourceParseModalProps } from "./features/folder-source-parse-modal.tsx";
export { HostFilePickerDialog, type HostFilePickerDialogProps } from "./features/host-file-picker-dialog.tsx";
export type { HostFilePickerOperations } from "./features/host-operations.ts";
export { SourcePickerModal, type SourcePickerModalProps } from "./features/source-picker-modal.tsx";
export {
  AlignGrid,
  AlignTools,
  ReadonlyPathField,
} from "./features/align-controls.tsx";
export { ContrastControl } from "./features/contrast-control.tsx";
export {
  FrameNavigation,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
  type NavigationOption,
} from "./features/frame-navigation.tsx";
