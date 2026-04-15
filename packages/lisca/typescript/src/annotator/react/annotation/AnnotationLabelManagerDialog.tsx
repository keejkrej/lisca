import type { AnnotationLabel } from "lisca/shared/contracts";
import { Button, Input, cn } from "lisca/shared/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { colorStyle, slugifyLabelId } from "./annotationUtils";
import { useRoiAnnotationContext } from "./RoiAnnotationContext";
import { annotationLabelTileClass } from "./toolbar/AnnotationLabelTile";

function labelsEqual(a: AnnotationLabel[], b: AnnotationLabel[]): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((x) => [x.id, x]));
  for (const l of a) {
    const o = byId.get(l.id);
    if (!o || o.name !== l.name || o.color !== l.color) return false;
  }
  return true;
}

/** Labels configure dialog shell (fixed); tile row scrolls horizontally inside. */
const LABELS_MODAL_W_REM = 20;
const LABELS_MODAL_H_REM = 10;

/** Popover: Name, id, color (stacked); footer: Cancel + Apply */
const PANEL_W = 224;
const PANEL_H = 320;

type LabelPanelState =
  | { open: false }
  | {
      open: true;
      x: number;
      y: number;
      mode: "edit" | "create";
      editLabelId?: string;
    };

export default function AnnotationLabelManagerDialog() {
  const {
    labelManagerOpen,
    setLabelManagerOpen,
    labelSaveState,
    setLabelSaveState,
    localLabels,
    canManageLabels,
    commitAnnotationLabels,
  } = useRoiAnnotationContext();

  const [draftLabels, setDraftLabels] = useState<AnnotationLabel[]>([]);
  const [panel, setPanel] = useState<LabelPanelState>({ open: false });
  const [form, setForm] = useState({ name: "", id: "", color: "#22c55e" });
  const [panelError, setPanelError] = useState<string | null>(null);
  const labelsRef = useRef(localLabels);
  labelsRef.current = localLabels;

  const panelRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!labelManagerOpen) return;
    setDraftLabels(labelsRef.current.map((l) => ({ ...l })));
    setPanel({ open: false });
    setForm({ name: "", id: "", color: "#22c55e" });
    setPanelError(null);
    setLabelSaveState({ saving: false, error: null });
  }, [labelManagerOpen, setLabelSaveState]);

  const dirty = useMemo(() => !labelsEqual(draftLabels, localLabels), [draftLabels, localLabels]);

  function clampPanelPosition(x: number, y: number) {
    const pad = 8;
    const maxX = Math.max(pad, window.innerWidth - PANEL_W - pad);
    const maxY = Math.max(pad, window.innerHeight - PANEL_H - pad);
    return {
      x: Math.min(Math.max(x, pad), maxX),
      y: Math.min(Math.max(y, pad), maxY),
    };
  }

  function openEditPanel(clientX: number, clientY: number, label: AnnotationLabel) {
    if (!canManageLabels) return;
    setForm({ name: label.name, id: label.id, color: label.color });
    setPanelError(null);
    const p = clampPanelPosition(clientX, clientY);
    setPanel({ open: true, x: p.x, y: p.y, mode: "edit", editLabelId: label.id });
  }

  function openCreatePanel(anchor: DOMRect) {
    if (!canManageLabels) return;
    setForm({ name: "", id: "", color: "#22c55e" });
    setPanelError(null);
    const cx = anchor.left + anchor.width / 2 - PANEL_W / 2;
    const cy = anchor.bottom + 6;
    const p = clampPanelPosition(cx, cy);
    setPanel({ open: true, x: p.x, y: p.y, mode: "create" });
  }

  useEffect(() => {
    if (!panel.open) return;
    const id = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [panel.open]);

  useEffect(() => {
    if (!panel.open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setPanel({ open: false });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [panel.open]);

  useEffect(() => {
    if (!panel.open) return;
    const onPointerDown = (event: PointerEvent) => {
      const el = panelRef.current;
      if (el?.contains(event.target as Node)) return;
      setPanel({ open: false });
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [panel.open]);

  const applyPanel = () => {
    const name = form.name.trim();
    const id = (form.id.trim() || slugifyLabelId(name)).trim();
    if (!name) {
      setPanelError("Name is required.");
      return;
    }
    if (!id) {
      setPanelError("Id is required.");
      return;
    }

    if (!panel.open) return;

    if (panel.mode === "create") {
      if (draftLabels.some((l) => l.id === id)) {
        setPanelError(`A label with id '${id}' already exists.`);
        return;
      }
      setDraftLabels((prev) => [...prev, { id, name, color: form.color }]);
      setLabelSaveState({ saving: false, error: null });
      setPanel({ open: false });
      return;
    }

    const oldId = panel.editLabelId;
    if (!oldId) return;
    if (draftLabels.some((l) => l.id === id && l.id !== oldId)) {
      setPanelError(`A label with id '${id}' already exists.`);
      return;
    }
    setDraftLabels((prev) =>
      prev.map((l) => (l.id === oldId ? { id, name, color: form.color } : l)),
    );
    setLabelSaveState({ saving: false, error: null });
    setPanel({ open: false });
  };

  const handleSave = async () => {
    if (!dirty || !canManageLabels || labelSaveState.saving) return;
    const ok = await commitAnnotationLabels(draftLabels);
    if (ok) setLabelManagerOpen(false);
  };

  if (!labelManagerOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !labelSaveState.saving) {
          setLabelManagerOpen(false);
        }
      }}
    >
      <div
        className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        style={{
          width: `min(${LABELS_MODAL_W_REM}rem, calc(100vw - 2rem))`,
          height: `min(${LABELS_MODAL_H_REM}rem, calc(100vh - 4rem))`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="annotation-label-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-border px-4 py-3">
          <h2 id="annotation-label-settings-title" className="text-sm font-medium text-foreground">
            Labels
          </h2>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
          {labelSaveState.error ? (
            <div
              className="shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              {labelSaveState.error}
            </div>
          ) : null}

          <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch]">
            <div className="flex w-max flex-nowrap items-center gap-2">
              {draftLabels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  disabled={!canManageLabels}
                  title={label.name}
                  className={cn(
                    annotationLabelTileClass,
                    "w-36 shrink-0 outline-none",
                    canManageLabels
                      ? "hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring"
                      : "cursor-not-allowed opacity-50",
                  )}
                  style={colorStyle(label.color, false)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    openEditPanel(event.clientX, event.clientY, label);
                  }}
                  aria-label={`Label ${label.name}`}
                >
                  <span className="min-w-0 w-full truncate text-center">{label.name}</span>
                </button>
              ))}

              <button
                type="button"
                disabled={!canManageLabels || labelSaveState.saving}
                className={cn(
                  annotationLabelTileClass,
                  "w-36 shrink-0 border-dashed border-border bg-muted/15 text-muted-foreground outline-none",
                  "hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                onClick={(event) => openCreatePanel(event.currentTarget.getBoundingClientRect())}
                aria-label="Add label"
              >
                <span className="text-base font-medium leading-none">+</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-row justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={labelSaveState.saving}
            onClick={() => setLabelManagerOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={!canManageLabels || labelSaveState.saving || !dirty}
            loading={labelSaveState.saving}
            onClick={() => void handleSave()}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );

  const panelLayer =
    panel.open &&
    createPortal(
      <div
        ref={panelRef}
        className="fixed z-[110] box-border w-[min(14rem,calc(100vw-1rem))] min-w-[min(12rem,calc(100vw-1rem))] rounded-lg border border-border bg-card p-4 shadow-lg outline-none"
        style={{ left: panel.x, top: panel.y }}
        role="dialog"
        aria-label={panel.mode === "create" ? "New label" : "Edit label"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-5">
          {panelError ? (
            <p className="text-xs leading-relaxed text-destructive" role="alert">
              {panelError}
            </p>
          ) : null}

          <div className="flex min-w-0 flex-col gap-2.5">
            <Input
              size="sm"
              value={form.name}
              placeholder="Name"
              onChange={(event) => {
                const name = event.target.value;
                setForm((current) => ({
                  ...current,
                  name,
                  id: current.id.length > 0 ? current.id : slugifyLabelId(name),
                }));
              }}
            />
            <Input
              size="sm"
              className="font-mono text-xs"
              value={form.id}
              placeholder="id"
              onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
            />
            <button
              type="button"
              className="h-10 w-full rounded-lg border border-border shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ backgroundColor: form.color }}
              aria-label="Choose color"
              onClick={() => colorInputRef.current?.click()}
            />
          </div>

          <div className="flex flex-row items-center justify-end gap-2 border-t border-border/80 pt-5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-4 text-xs"
              type="button"
              onClick={() => setPanel({ open: false })}
            >
              Cancel
            </Button>
            <Button size="sm" className="h-8 px-4 text-xs" type="button" onClick={applyPanel}>
              Apply
            </Button>
          </div>
        </div>
        {/* Native color inputs ignore sr-only and can paint a 1px strip; keep off-DOM visually. */}
        <input
          ref={colorInputRef}
          type="color"
          tabIndex={-1}
          aria-hidden
          className="fixed left-[-9999px] top-0 m-0 h-0 max-h-0 max-w-0 min-h-0 min-w-0 w-0 shrink-0 overflow-hidden border-0 p-0 opacity-0"
          value={form.color}
          onChange={(event) =>
            setForm((current) => ({ ...current, color: event.target.value }))
          }
        />
      </div>,
      document.body,
    );

  return (
    <>
      {createPortal(modal, document.body)}
      {panelLayer}
    </>
  );
}
