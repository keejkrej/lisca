import type { AlignerSource } from "@lisca/contracts";
import { For, Show } from "solid-js";

import { buttonVariants } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Field, FieldLabel } from "../../components/ui/field";
import { cn } from "../../lib/utils";
import { PathPickerTriggerContent, pathPickerTriggerClass } from "./path-picker-field";
import type { SourcePickerRecentItem } from "./source-picker-modal";

export type SourcePickerFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  actionLabel?: string;
  recentSources?: readonly SourcePickerRecentItem[];
  onOpenFolder: () => void;
  onOpenNd2: () => void;
  onOpenCzi: () => void;
  onPickRecentSource?: (source: AlignerSource) => void;
  /** Lets callers load recent sources lazily when the menu opens. */
  onMenuOpenChange?: (open: boolean) => void;
};

const SOURCE_FORMATS = [
  { key: "folder", label: "Folder", hint: "Image sequence" },
  { key: "nd2", label: "ND2", hint: "Nikon" },
  { key: "czi", label: "CZI", hint: "Zeiss" },
] as const;

/** A read-only source path whose surface opens a format menu; each format opens a picker. */
export function SourcePickerField(props: SourcePickerFieldProps) {
  const actionLabel = () => props.actionLabel ?? "Browse";
  const displayValue = () => props.value.trim() || props.placeholder;
  const openFormat = (key: (typeof SOURCE_FORMATS)[number]["key"]) => {
    if (key === "folder") props.onOpenFolder();
    else if (key === "nd2") props.onOpenNd2();
    else props.onOpenCzi();
  };
  // Open like a context menu: at the pointer, sized to its items. Keyboard opens
  // fall back to the leading edge of the field.
  let pointer: { x: number; y: number } | null = null;
  const anchorRect = (anchor?: HTMLElement) => {
    if (pointer) return { x: pointer.x, y: pointer.y, width: 0, height: 0 };
    const rect = anchor?.getBoundingClientRect();
    return rect && { x: rect.x, y: rect.y, width: 0, height: rect.height };
  };
  const recent = () => (props.onPickRecentSource ? (props.recentSources ?? []) : []);

  return (
    <Field class="w-full gap-2">
      <FieldLabel class="text-sm font-medium leading-[18px]" for={props.id}>
        {props.label}
      </FieldLabel>
      <DropdownMenu
        getAnchorRect={anchorRect}
        placement="bottom-start"
        onOpenChange={props.onMenuOpenChange}
      >
        <DropdownMenuTrigger
          aria-label={`${props.label}: ${displayValue()}. ${actionLabel()}`}
          class={cn(buttonVariants({ variant: "outline", size: "sm" }), pathPickerTriggerClass)}
          id={props.id}
          title={props.value.trim() || props.placeholder}
          type="button"
          onKeyDown={() => {
            pointer = null;
          }}
          onPointerDown={(event: PointerEvent) => {
            pointer = { x: event.clientX, y: event.clientY };
          }}
        >
          <PathPickerTriggerContent
            actionLabel={actionLabel()}
            placeholder={props.placeholder}
            value={props.value}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-max min-w-44 max-w-80">
          <DropdownMenuGroup>
            <For each={SOURCE_FORMATS}>
              {(format) => (
                <DropdownMenuItem class="text-[13px]" onSelect={() => openFormat(format.key)}>
                  <span class="flex-1 font-medium">{format.label}</span>
                  <span class="text-muted-foreground text-xs">{format.hint}</span>
                </DropdownMenuItem>
              )}
            </For>
          </DropdownMenuGroup>
          <Show when={recent().length > 0}>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Recent</DropdownMenuLabel>
              <For each={recent()}>
                {(item) => (
                  <DropdownMenuItem
                    class="flex-col items-stretch gap-0.5"
                    title={item.source.path}
                    onSelect={() => props.onPickRecentSource!(item.source)}
                  >
                    <span class="font-medium text-[13px]">
                      {item.label ?? item.source.kind.toUpperCase()}
                    </span>
                    <span class="truncate font-mono text-muted-foreground">{item.source.path}</span>
                  </DropdownMenuItem>
                )}
              </For>
            </DropdownMenuGroup>
          </Show>
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  );
}
