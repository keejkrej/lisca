import IconCopyRegular from "phosphor-icons-solid/IconCopyRegular";
import type { JSX } from "solid-js";
import { createSignal, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";

/** Basename path control (`Button` outline; matches shell chrome). */
export function PathButton(props: {
  label: string;
  value: string | null;
  icon?: JSX.Element;
  appearance?: "default" | "stage";
  preserveExtension?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const display = () => {
    const basename = props.value?.split(/[\\/]/).findLast((part) => part.length > 0);
    if (!basename) return null;
    return props.preserveExtension ? basename : basename.replace(/\.[^./\\]+$/, "");
  };

  const disabled = () => props.disabled ?? !props.onClick;

  if (props.appearance === "stage") {
    return <StagePathButton {...props} disabled={disabled()} />;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled()}
      title={props.value ? props.value : props.label}
      onClick={() => {
        if (!disabled()) props.onClick?.();
      }}
      class="max-w-[min(100%,18rem)] justify-start gap-2 font-normal"
    >
      <span class="shrink-0">{props.icon}</span>
      <span class="min-w-0 truncate">{display() ?? props.label}</span>
    </Button>
  );
}

/** Compact stage variant: label-only trigger; hover shows the full path; right-click copies. */
function StagePathButton(props: {
  label: string;
  value: string | null;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const [copied, setCopied] = createSignal(false);
  const copyPath = async () => {
    if (!props.value) return;
    try {
      await navigator.clipboard?.writeText(props.value);
      setCopied(true);
      // Revert back to the path after a short beat so the click feels acknowledged.
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard may be unavailable (e.g. no permission); leave the tooltip state alone.
    }
  };

  return (
    <Tooltip placement="bottom" openDelay={100} closeDelay={400} gutter={2}>
      <TooltipTrigger
        as={Button}
        type="button"
        variant="ghost"
        size="sm"
        disabled={props.disabled}
        aria-label={props.value ? `${props.label}: ${props.value}` : `${props.label}: not set`}
        onClick={() => {
          if (!props.disabled) props.onClick?.();
        }}
        onContextMenu={(event: MouseEvent) => {
          if (!props.value) return;
          event.preventDefault();
          void copyPath();
        }}
        class="h-8 border-0 px-2.5 font-normal shadow-none"
      >
        <span class="shrink-0 text-[10px] font-normal uppercase tracking-[0.12em] text-foreground">
          {props.label}
        </span>
      </TooltipTrigger>
      <TooltipContent class="max-w-[min(90vw,32rem)]">
        <div class="flex items-center gap-2">
          <Show
            when={props.value}
            fallback={<span>Pick a {props.label.toLowerCase()} folder</span>}
          >
            {(path) => (
              <>
                <code class="min-w-0 flex-1 truncate text-left font-mono text-[11px]">
                  {copied() ? "Copied" : path()}
                </code>
                <button
                  type="button"
                  aria-label={copied() ? "Copied" : "Copy path"}
                  class="shrink-0 rounded p-1 text-background/70 transition-colors hover:bg-background/15 hover:text-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-background/60"
                  onClick={() => void copyPath()}
                >
                  <IconCopyRegular class="size-3.5" />
                </button>
              </>
            )}
          </Show>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
