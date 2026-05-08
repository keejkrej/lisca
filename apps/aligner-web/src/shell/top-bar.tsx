import {
  ShellConnectionStatus,
  ShellDriveIcon,
  ShellFolderIcon,
  ShellHeaderBar,
  ShellPathChip,
  ShellSegmentedControl,
  type ShellWsProbe,
} from "@lisca/ui";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { AlignerMode } from "./mode";

export function AlignerTopBar(props: {
  mode: AlignerMode;
  onModeChange: (mode: AlignerMode) => void;
  workspacePath: string | null;
  sourcePath: string | null;
  onPickWorkspace: () => void;
  onPickSource: () => void;
  probe: ShellWsProbe;
}) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!toolsOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setToolsOpen(false);
        setPresetsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toolsOpen]);

  useEffect(() => {
    if (!toolsOpen) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      if (!toolsRef.current?.contains(event.target as Node)) {
        setToolsOpen(false);
        setPresetsOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [toolsOpen]);

  return (
    <ShellHeaderBar
      start={
        <ShellSegmentedControl
          aria-label="Aligner view mode"
          value={props.mode}
          onChange={props.onModeChange}
          options={[
            { value: "raw", label: "Raw" },
            { value: "roi", label: "ROI" },
          ]}
        />
      }
      center={
        <div className="flex max-w-[56rem] flex-wrap items-center justify-center gap-3">
          <ShellPathChip
            label="Workspace"
            value={props.workspacePath}
            icon={<ShellFolderIcon />}
            onClick={props.onPickWorkspace}
          />
          <ShellPathChip
            label="Source"
            value={props.sourcePath}
            icon={<ShellDriveIcon />}
            disabled={!props.workspacePath}
            onClick={props.workspacePath ? props.onPickSource : undefined}
          />
        </div>
      }
      end={
        <div className="flex items-center justify-end gap-2">
          <ShellConnectionStatus wsUrl={props.probe.wsUrl} state={props.probe.state} />
          <div ref={toolsRef} className="relative">
            <button
              type="button"
              className={[
                "min-w-[5.5rem] rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                toolsOpen
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50",
              ].join(" ")}
              onClick={() => {
                setToolsOpen((open) => {
                  const next = !open;
                  if (!next) setPresetsOpen(false);
                  return next;
                });
              }}
            >
              Tools
            </button>
            {toolsOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-56 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
                <button
                  type="button"
                  disabled
                  className="flex w-full items-start rounded-xl px-3 py-2 text-left transition-colors hover:bg-neutral-50 disabled:cursor-default disabled:opacity-55"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Batch crop</p>
                    <p className="text-xs text-neutral-500">Crop saved bbox CSVs</p>
                  </div>
                </button>
                <div className="relative">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-neutral-50"
                    onClick={() => setPresetsOpen((v) => !v)}
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Load preset</p>
                      <p className="text-xs text-neutral-500">Hardcoded align preset</p>
                    </div>
                    <svg
                      className="size-4 shrink-0 text-neutral-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M15 6L9 12l6 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {presetsOpen ? (
                    <div className="absolute right-[calc(100%+0.5rem)] top-0 z-50 w-52 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
                      <button
                        type="button"
                        disabled
                        className="flex w-full items-start rounded-xl px-3 py-2 text-left transition-colors hover:bg-neutral-50 disabled:cursor-default disabled:opacity-55"
                      >
                        <div>
                          <p className="text-sm font-medium text-neutral-900">Q20</p>
                          <p className="text-xs text-neutral-500">
                            Square, 168 pitch, 128 cell size
                          </p>
                        </div>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
