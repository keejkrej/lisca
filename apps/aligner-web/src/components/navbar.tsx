import {
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  HostFilePickerDialog,
  Input,
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
import {
  DEFAULT_FOLDER_SOURCE_TEMPLATE,
  FOLDER_SOURCE_TEMPLATE_PRESETS,
  type AlignerHostPort,
  type AlignerSource,
  type HostFilePickerMode,
} from "@lisca/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

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

function FolderSourceParseModal(props: {
  path: string | null;
  onClose: () => void;
  onConfirm: (source: AlignerSource) => void;
}) {
  const [subfolderTemplate, setSubfolderTemplate] = useState<string>(
    DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
  );
  const [filenameTemplate, setFilenameTemplate] = useState<string>(
    DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.path) return;
    setSubfolderTemplate(DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate);
    setFilenameTemplate(DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate);
    setError(null);
  }, [props.path]);

  if (!props.path) return null;
  const path = props.path;

  const confirm = () => {
    const filename = filenameTemplate.trim();
    if (!filename) {
      setError("Filename template is required.");
      return;
    }

    props.onConfirm({
      kind: "folder",
      path,
      subfolderTemplate: subfolderTemplate.trim(),
      filenameTemplate: filename,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div
        aria-labelledby="folder-source-template-title"
        aria-modal="true"
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl"
        role="dialog"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground text-lg" id="folder-source-template-title">
            Parse image folder
          </h2>
          <p className="mt-1 truncate text-muted-foreground text-sm" title={path}>
            {path}
          </p>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {FOLDER_SOURCE_TEMPLATE_PRESETS.map((preset) => (
              <Button
                key={`${preset.subfolderTemplate}/${preset.filenameTemplate}`}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => {
                  setSubfolderTemplate(preset.subfolderTemplate);
                  setFilenameTemplate(preset.filenameTemplate);
                  setError(null);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Field className="gap-2" name="subfolderTemplate">
            <FieldLabel htmlFor="folder-subfolder-template">Subfolder template</FieldLabel>
            <Input
              autoComplete="off"
              id="folder-subfolder-template"
              placeholder="Pos{p}"
              type="text"
              value={subfolderTemplate}
              onChange={(event) => {
                setSubfolderTemplate(event.target.value);
                setError(null);
              }}
            />
            <FieldDescription>Leave empty when files are directly in the folder.</FieldDescription>
          </Field>

          <Field className="gap-2" name="filenameTemplate">
            <FieldLabel htmlFor="folder-filename-template">Filename template</FieldLabel>
            <Input
              autoComplete="off"
              aria-invalid={Boolean(error)}
              id="folder-filename-template"
              placeholder="img_{t}_{c}_{z}.jpg"
              type="text"
              value={filenameTemplate}
              onChange={(event) => {
                setFilenameTemplate(event.target.value);
                setError(null);
              }}
            />
            {error ? <p className="text-destructive-foreground text-sm">{error}</p> : null}
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm}>
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Navbar(props: {
  routeId: RouteId;
  onSourcePicked: (source: AlignerSource | null) => void;
}) {
  const navigate = useNavigate();
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
        routeValue={props.routeId}
        showRouteToggle={false}
        showToolsMenu={true}
        wsDefaultPort={8765}
        onPickSource={() => setSourcePickerOpen(true)}
        onPickWorkspace={() => openFilePicker("workspace")}
        onRouteChange={(v: string) => navigate({ to: `/${v}` })}
      />

      <SourcePickerModal
        open={sourcePickerOpen}
        onClose={() => setSourcePickerOpen(false)}
        onOpenCzi={() => openFilePicker("czi_file")}
        onOpenFolder={() => openFilePicker("folder")}
        onOpenNd2={() => openFilePicker("nd2_file")}
      />

      <FolderSourceParseModal
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
