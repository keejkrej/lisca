import type { ChangeEvent, KeyboardEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "lisca/shared/ui";

type AppSelectValue = number | string;

export type ViewerAlignOption<T extends AppSelectValue> = {
  label: string;
  value: T;
};

export function NumberInput({
  value,
  onChange,
  disabled,
  step = "1",
  min,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  step?: string;
  min?: number | string;
}) {
  const [draftValue, setDraftValue] = useState(() => (Number.isFinite(value) ? String(value) : ""));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(Number.isFinite(value) ? String(value) : "");
    }
  }, [isEditing, value]);

  const commitDraft = useCallback(() => {
    const nextValue = Number(draftValue);
    if (Number.isFinite(nextValue)) {
      onChange(nextValue);
      return;
    }
    setDraftValue(Number.isFinite(value) ? String(value) : "");
  }, [draftValue, onChange, value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        commitDraft();
        setIsEditing(false);
        event.currentTarget.blur();
        return;
      }
      if (event.key === "Escape") {
        setDraftValue(Number.isFinite(value) ? String(value) : "");
        setIsEditing(false);
        event.currentTarget.blur();
      }
    },
    [commitDraft, value],
  );

  return (
    <Input
      type="number"
      size="sm"
      step={step}
      min={min}
      value={draftValue}
      disabled={disabled}
      onFocus={() => setIsEditing(true)}
      onBlur={() => {
        commitDraft();
        setIsEditing(false);
      }}
      onKeyDown={handleKeyDown}
      onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftValue(event.target.value)}
      className="text-sm"
    />
  );
}

export function AppSelect<T extends AppSelectValue>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: ViewerAlignOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <Select<T>
      value={value}
      onValueChange={(next: T | null) => next != null && onChange(next)}
      items={options}
      disabled={disabled}
      modal={false}
    >
      <SelectTrigger size="sm" className="text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AppSlider({
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <Slider
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={onChange}
      onValueCommitted={onCommit}
    />
  );
}
