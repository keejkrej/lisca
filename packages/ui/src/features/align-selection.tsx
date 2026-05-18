"use client";

import { Button } from "../components/ui/button";
import { Field, FieldLabel } from "../components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { Section } from "../shell/section";

export type AlignSelectionMode = "view" | "edit";

export type AlignSelectionProps = {
  /** `view` = view-only; `edit` = cell editing. */
  mode: AlignSelectionMode;
  onModeChange: (mode: AlignSelectionMode) => void;

  includedCells: number | string;
  excludedCells: number | string;

  onReset?: () => void;
  onExcludeAll?: () => void;
  onExcludeEdge?: () => void;
  /** Opens auto-exclude flow (modal is host-owned). */
  onAutoExclude?: () => void;

  resetDisabled?: boolean;
  excludeAllDisabled?: boolean;
  excludeEdgeDisabled?: boolean;
  autoExcludeDisabled?: boolean;

  disabled?: boolean;

  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
};

/**
 * Selection controls in a {@link Section} card: mode toggle, included/excluded counts, action buttons.
 * Wire {@link onAutoExclude} to open the host’s auto-exclude dialog.
 */
export function AlignSelection(props: AlignSelectionProps) {
  const {
    mode,
    onModeChange,
    includedCells,
    excludedCells,
    onReset,
    onExcludeAll,
    onExcludeEdge,
    onAutoExclude,
    resetDisabled,
    excludeAllDisabled,
    excludeEdgeDisabled,
    autoExcludeDisabled,
    disabled,
    sectionTitle = "Selection",
    sectionDescription,
    sectionClassName,
    sectionContentClassName,
  } = props;

  const btnClass = "h-8 justify-center px-3 text-xs";

  return (
    <Section
      contentClassName={sectionContentClassName}
      description={sectionDescription}
      title={sectionTitle}
      className={sectionClassName}
    >
      <div className="min-w-0 space-y-3">
        <Field className="min-w-0 w-full">
          <FieldLabel>Mode</FieldLabel>
          <ToggleGroup
            className="w-full min-w-0"
            disabled={disabled}
            multiple={false}
            size="sm"
            value={[mode]}
            variant="outline"
            onValueChange={(next) => {
              const v = next[0];
              if (v) onModeChange(v as AlignSelectionMode);
            }}
          >
            <ToggleGroupItem className="min-w-0 flex-1 px-2 text-xs" value="view">
              View
            </ToggleGroupItem>
            <ToggleGroupItem className="min-w-0 flex-1 px-2 text-xs" value="edit">
              Edit
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <div className="grid w-full grid-cols-2 gap-2">
          <Field className="min-w-0 w-full">
            <FieldLabel>Included Cells</FieldLabel>
            <div className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
              {includedCells}
            </div>
          </Field>
          <Field className="min-w-0 w-full">
            <FieldLabel>Excluded Cells</FieldLabel>
            <div className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
              {excludedCells}
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            className={btnClass}
            disabled={disabled || resetDisabled || !onReset}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onReset?.()}
          >
            Reset
          </Button>
          <Button
            className={btnClass}
            disabled={disabled || excludeAllDisabled || !onExcludeAll}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onExcludeAll?.()}
          >
            Exclude all
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            className={btnClass}
            disabled={disabled || excludeEdgeDisabled || !onExcludeEdge}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onExcludeEdge?.()}
          >
            Edge exclude
          </Button>
          <Button
            className={btnClass}
            disabled={disabled || autoExcludeDisabled || !onAutoExclude}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onAutoExclude?.()}
          >
            Auto exclude
          </Button>
        </div>
      </div>
    </Section>
  );
}
