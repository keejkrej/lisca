import {
  Button,
  ShellConnectionStatus,
  ShellDriveIcon,
  ShellFolderIcon,
  ShellHeaderBar,
  ShellPathChip,
  ShellSegmentedControl,
  useShellWsProbe,
  useShellWorkspace,
} from "@lisca/ui";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import type { RouteId } from "../types";

function ToolsMenu(props: { disabled?: boolean }) {
  const toolsRef = useRef<HTMLDivElement | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    if (!toolsOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!toolsRef.current?.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [toolsOpen]);

  useEffect(() => {
    if (!toolsOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setToolsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toolsOpen]);

  return (
    <div ref={toolsRef} className="relative">
      <Button
        size="sm"
        variant={toolsOpen ? "default" : "outline"}
        className="min-w-[5.5rem]"
        disabled={props.disabled}
        onClick={() => setToolsOpen((current) => !current)}
      >
        Tools
      </Button>
      {toolsOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-56 rounded-2xl border border-border bg-card p-2 shadow-lg">
          <button
            type="button"
            className="flex w-full items-start rounded-xl bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-55"
            disabled
          >
            <div>
              <p className="font-medium text-foreground">Batch Crop</p>
              <p className="text-muted-foreground text-xs">Not wired yet</p>
            </div>
          </button>
          <button
            type="button"
            className="mt-1 flex w-full items-start rounded-xl bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-55"
            disabled
          >
            <div>
              <p className="font-medium text-foreground">Load Preset</p>
              <p className="text-muted-foreground text-xs">Not wired yet</p>
            </div>
          </button>
        </div>
      ) : null}
    </div>
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
          <ShellSegmentedControl<RouteId>
            aria-label="Align workspace"
            value={props.routeId}
            onChange={(next) => {
              navigate({ to: `/${next}` });
            }}
            options={[
              { value: "align", label: "Align" },
              { value: "inspect", label: "Inspect" },
            ]}
          />
        }
        center={
          <div className="flex max-w-[56rem] flex-wrap items-center justify-center gap-3">
            <ShellPathChip
              label="Workspace"
              value={workspace.workspacePath}
              icon={<ShellFolderIcon />}
              onClick={() => workspace.pickWorkspace()}
            />
            <ShellPathChip
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
          <div className="flex items-center justify-end gap-2">
            <ShellConnectionStatus wsUrl={ws.wsUrl} state={ws.state} />
            <ToolsMenu />
          </div>
        }
      />

      <SourcePickerStub open={sourceModalOpen} onClose={closeSourceModal} />
    </>
  );
}
