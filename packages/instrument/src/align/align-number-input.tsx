import { createEffect, createSignal } from "solid-js";

import { Input } from "@lisca/ui/input";

function formatNumber(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

export function AlignNumberInput(props: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  disabled?: boolean;
  min?: number;
  step?: string;
}) {
  const [draft, setDraft] = createSignal(formatNumber(props.value));
  let skipBlurCommit = false;

  createEffect(() => {
    setDraft(formatNumber(props.value));
  });

  const revert = () => setDraft(formatNumber(props.value));
  const commit = () => {
    if (skipBlurCommit) {
      skipBlurCommit = false;
      revert();
      return;
    }
    const trimmed = draft().trim();
    const value = trimmed === "" ? NaN : Number(trimmed);
    if (!Number.isFinite(value) || (props.min != null && value < props.min)) {
      revert();
      return;
    }
    setDraft(formatNumber(value));
    props.onCommit(value);
  };

  return (
    <Input
      autocomplete="off"
      aria-label={props.label}
      disabled={props.disabled}
      min={props.min}
      name={props.label.toLowerCase().replaceAll(" ", "-")}
      size="sm"
      step={props.step ?? "any"}
      type="number"
      value={draft()}
      onBlur={commit}
      onInput={(event) => setDraft(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          skipBlurCommit = true;
          revert();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
