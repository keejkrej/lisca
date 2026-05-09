import {
  Button,
  buttonVariants,
  cn,
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
  ShellConnectionStatus,
  ShellDriveIcon,
  ShellFolderIcon,
  ShellHeaderBar,
  ShellPathBadge,
  ShellThemeToggle,
  ToggleGroup,
  ToggleGroupItem,
  useShellWsProbe,
  useShellWorkspace,
} from "@lisca/ui";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import type { RouteId } from "../types";

function ToolsMenuChevron(props: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ToolsMenu(props: { disabled?: boolean }) {
  return (
    <Menu>
      <MenuTrigger
        disabled={props.disabled}
        className={cn(
          buttonVariants({
            size: "sm",
            variant: "outline",
            className:
              "group inline-flex w-fit shrink-0 justify-between gap-2 font-normal text-foreground shadow-none hover:bg-muted/40 data-popup-open:bg-muted/60",
          }),
        )}
      >
        Tools
        <ToolsMenuChevron className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[popup-open]:rotate-180" />
      </MenuTrigger>
      <MenuPopup
        align="end"
        className="w-56 rounded-2xl border-border p-2 shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
        side="bottom"
        sideOffset={8}
      >
        <MenuItem
          disabled
          className="h-auto min-h-0 flex-col items-stretch gap-0.5 py-2.5 text-left"
        >
          <span className="font-medium text-foreground text-sm">Batch Crop</span>
          <span className="text-muted-foreground text-xs">Not wired yet</span>
        </MenuItem>
        <MenuItem
          disabled
          className="h-auto min-h-0 flex-col items-stretch gap-0.5 py-2.5 text-left"
        >
          <span className="font-medium text-foreground text-sm">Load Preset</span>
          <span className="text-muted-foreground text-xs">Not wired yet</span>
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

function SourcePickerStub(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props;

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose image source"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="font-semibold text-lg">Open image source</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Placeholder for TIFF / JPEG / ND2 / CZI pickers — logic comes later.
        </p>
        <div className="mt-4 grid gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            TIFF folder
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            JPEG / PNG folder
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            ND2 file
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            CZI file
          </Button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Navbar(props: { routeId: RouteId }) {
  const navigate = useNavigate();
  const ws = useShellWsProbe({ defaultPort: 8765 });
  const workspace = useShellWorkspace();

  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const closeSourceModal = useCallback(() => setSourceModalOpen(false), []);

  return (
    <>
      <ShellHeaderBar
        start={
          <ToggleGroup
            className="flex-nowrap gap-1 rounded-xl border border-border bg-muted/35 p-1"
            multiple={false}
            size="sm"
            value={[props.routeId]}
            onValueChange={(next) => {
              const nextRoute = next[0];
              if (nextRoute) navigate({ to: `/${nextRoute}` });
            }}
          >
            <ToggleGroupItem value="align" className="min-w-[4.5rem]">
              Align
            </ToggleGroupItem>
            <ToggleGroupItem value="inspect" className="min-w-[4.5rem]">
              Inspect
            </ToggleGroupItem>
          </ToggleGroup>
        }
        center={
          <div className="flex max-w-[56rem] flex-wrap items-center justify-center gap-3">
            <ShellPathBadge
              label="Workspace"
              value={workspace.workspacePath}
              icon={<ShellFolderIcon />}
              onClick={() => workspace.pickWorkspace()}
            />
            <ShellPathBadge
              label="Source"
              value={workspace.sourcePath}
              icon={<ShellDriveIcon />}
              disabled={!workspace.workspacePath}
              onClick={
                workspace.workspacePath ? () => setSourceModalOpen(true) : undefined
              }
            />
          </div>
        }
        end={
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <ShellConnectionStatus wsUrl={ws.wsUrl} state={ws.state} />
            <ToolsMenu />
            <ShellThemeToggle />
          </div>
        }
      />

      <SourcePickerStub open={sourceModalOpen} onClose={closeSourceModal} />
    </>
  );
}
