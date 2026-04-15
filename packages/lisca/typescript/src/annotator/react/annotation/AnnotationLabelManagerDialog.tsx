import { Button, Input } from "lisca/viewer/ui";

import { colorStyle, slugifyLabelId } from "./annotationUtils";
import { useRoiAnnotationContext } from "./RoiAnnotationContext";

export default function AnnotationLabelManagerDialog() {
  const {
    labelManagerOpen,
    setLabelManagerOpen,
    labelSaveState,
    localLabels,
    labelDraft,
    setLabelDraft,
    labelColorDrafts,
    setLabelColorDrafts,
    canManageLabels,
    handleAddLabel,
    handleSaveLabelColors,
    labelColorsDirty,
  } = useRoiAnnotationContext();

  if (!labelManagerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !labelSaveState.saving) {
          setLabelManagerOpen(false);
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-[1.5rem] border border-border/80 bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="annotation-label-settings-title"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <h2
              id="annotation-label-settings-title"
              className="text-base font-medium text-foreground"
            >
              Annotation Label Settings
            </h2>
            <p className="text-sm text-muted-foreground">
              Add labels and tune their colors for classification chips and semantic mask painting.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 text-xs"
            disabled={labelSaveState.saving}
            onClick={() => setLabelManagerOpen(false)}
          >
            Close
          </Button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {localLabels.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Current labels
              </p>
              <div className="space-y-2">
                {localLabels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/45 px-3 py-2"
                  >
                    <div className="min-w-0 space-y-1">
                      <span
                        className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={colorStyle(labelColorDrafts[label.id] ?? label.color, false)}
                      >
                        {label.name}
                      </span>
                      <p className="text-xs text-muted-foreground">{label.id}</p>
                    </div>
                    <Input
                      nativeInput
                      type="color"
                      size="sm"
                      className="h-9 w-14 shrink-0 overflow-hidden px-1.5"
                      value={labelColorDrafts[label.id] ?? label.color}
                      onChange={(event) =>
                        setLabelColorDrafts((current) => ({
                          ...current,
                          [label.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-xs"
                  disabled={!canManageLabels || labelSaveState.saving || !labelColorsDirty}
                  onClick={() => void handleSaveLabelColors()}
                >
                  {labelSaveState.saving && labelColorsDirty ? "Saving colors..." : "Save colors"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-background/45 px-4 py-3 text-sm text-muted-foreground">
              No labels yet. Add one below to enable annotation for this surface.
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)_10rem] gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Label name</p>
              <Input
                size="sm"
                value={labelDraft.name}
                placeholder="Cell"
                onChange={(event) => {
                  const name = event.target.value;
                  setLabelDraft((current) => ({
                    ...current,
                    name,
                    id: current.id.length > 0 ? current.id : slugifyLabelId(name),
                  }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Color</p>
              <Input
                nativeInput
                type="color"
                size="sm"
                className="h-9 overflow-hidden px-1.5"
                value={labelDraft.color}
                onChange={(event) =>
                  setLabelDraft((current) => ({ ...current, color: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Label id</p>
            <Input
              size="sm"
              value={labelDraft.id}
              placeholder="cell"
              onChange={(event) =>
                setLabelDraft((current) => ({ ...current, id: event.target.value }))
              }
            />
          </div>

          {labelSaveState.error ? (
            <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {labelSaveState.error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-3 text-xs"
              disabled={labelSaveState.saving}
              onClick={() => setLabelManagerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 px-3 text-xs"
              disabled={!canManageLabels || labelSaveState.saving}
              onClick={() => void handleAddLabel()}
            >
              {labelSaveState.saving ? "Adding label..." : "Add label"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
