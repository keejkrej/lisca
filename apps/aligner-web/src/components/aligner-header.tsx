import {
  FolderSourceParseModal,
  HostFilePickerDialog,
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
  ShellNavbar,
  SourcePickerModal,
  buttonVariants,
  cn,
  useShellWorkspace,
} from "@lisca/ui";
import type { AlignerHostPort, AlignerSource, HostFilePickerMode } from "@lisca/contracts";
import { useMemo, useRef, useState } from "react";

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

function ToolsMenu() {
  return (
    <Menu>
      <MenuTrigger
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
        <MenuItem className="h-auto min-h-0 flex-col items-stretch gap-0.5 py-2.5 text-left">
          <span className="font-medium text-foreground text-sm">Hello</span>
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

function createHttpHostPort(baseUrl: string): AlignerHostPort {
  async function readJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  return {
    listDirectory(path) {
      const url = new URL("/fs/list", baseUrl);
      if (path) url.searchParams.set("path", path);
      return readJson(url.toString());
    },
    userHomeDirectory() {
      return readJson<{ path: string }>(new URL("/fs/home", baseUrl).toString()).then(
        (result) => result.path,
      );
    },
  };
}

function filePickerTitle(mode: HostFilePickerMode): string {
  if (mode === "workspace") return "Workspace folder";
  if (mode === "folder") return "Image folder";
  if (mode === "nd2_file") return "ND2 file";
  if (mode === "czi_file") return "CZI file";
  return "File";
}

export function AlignerHeader(props: { onSourcePicked: (source: AlignerSource | null) => void }) {
  const workspace = useShellWorkspace();
  const pickerModeRef = useRef<HostFilePickerMode | null>(null);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [folderSourcePath, setFolderSourcePath] = useState<string | null>(null);
  const [filePicker, setFilePicker] = useState<{
    open: boolean;
    mode: HostFilePickerMode;
    title: string;
  }>({ open: false, mode: "workspace", title: "" });

  const hostPort = useMemo(() => createHttpHostPort("http://127.0.0.1:8765"), []);

  const openFilePicker = (mode: HostFilePickerMode) => {
    pickerModeRef.current = mode;
    setFilePicker({ open: true, mode, title: filePickerTitle(mode) });
  };

  const applyPickDirectory = (path: string) => {
    const mode = pickerModeRef.current;
    if (mode === "workspace") {
      workspace.setWorkspacePath(path);
      props.onSourcePicked(null);
      return;
    }
    if (mode === "folder") {
      setFolderSourcePath(path);
    }
  };

  const applyPickFile = (path: string) => {
    const mode = pickerModeRef.current;
    if (mode === "nd2_file") {
      workspace.setSourcePath(path);
      props.onSourcePicked({ kind: "nd2", path });
    }
    if (mode === "czi_file") {
      workspace.setSourcePath(path);
      props.onSourcePicked({ kind: "czi", path });
    }
  };

  return (
    <>
      <ShellNavbar
        endLeading={<ToolsMenu />}
        routeItems={[{ value: "align", label: "Align" }]}
        routeValue="align"
        showRouteToggle={false}
        showToolsMenu={true}
        onPickSource={() => setSourcePickerOpen(true)}
        onPickWorkspace={() => openFilePicker("workspace")}
        onRouteChange={() => undefined}
      />

      <SourcePickerModal
        open={sourcePickerOpen}
        onClose={() => setSourcePickerOpen(false)}
        onOpenCzi={() => openFilePicker("czi_file")}
        onOpenFolder={() => openFilePicker("folder")}
        onOpenNd2={() => openFilePicker("nd2_file")}
      />

      <FolderSourceParseModal
        hostPort={hostPort}
        path={folderSourcePath}
        onClose={() => setFolderSourcePath(null)}
        onConfirm={(source) => {
          workspace.setSourcePath(source.path);
          props.onSourcePicked(source);
          setFolderSourcePath(null);
        }}
      />

      <HostFilePickerDialog
        hostPort={hostPort}
        mode={filePicker.mode}
        open={filePicker.open}
        title={filePicker.title}
        onOpenChange={(open) => {
          setFilePicker((current) => ({ ...current, open }));
          if (!open) pickerModeRef.current = null;
        }}
        onPickDirectory={applyPickDirectory}
        onPickFile={applyPickFile}
      />
    </>
  );
}
