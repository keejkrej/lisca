import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lisca/ui/components";
import { ShellThemeToggle } from "@lisca/ui/shell";
import IconImageRegular from "phosphor-icons-solid/IconImageRegular";
import { Show, type JSX } from "solid-js";

const imageAccept = ".png,.jpg,.jpeg,.tif,.tiff,image/png,image/jpeg,image/tiff";
const sampleFileNameWidthClassName = "min-w-0 max-w-[9rem] sm:max-w-[11rem]";
const sampleFileNameTextClassName = "font-mono text-xs text-muted-foreground sm:text-sm";

export type DemoSampleImageOption = {
  id: string;
  fileName: string;
};

export type DemoNavbarProps = {
  fileName: string | null;
  loading?: boolean;
  /** Actions placed after the Image button on the left. */
  startTrailing?: JSX.Element;
  endLeading?: JSX.Element;
  /** When false, the navbar omits its theme toggle (e.g. embedded landing previews). */
  showThemeToggle?: boolean;
  /** When false, hides the file picker — embedded previews use a fixed sample frame. */
  allowOpenFile?: boolean;
  /** Sample images for embedded previews; shows a dropdown instead of static filename text. */
  sampleImages?: readonly DemoSampleImageOption[];
  selectedSampleId?: string | null;
  onSampleChange?: (sampleId: string) => void;
  onOpenFile: (file: File) => void;
};

export function DemoNavbar(props: DemoNavbarProps) {
  let inputRef: HTMLInputElement | undefined;
  const sampleImages = () => props.sampleImages ?? [];
  const selectedSampleId = () => props.selectedSampleId ?? sampleImages()[0]?.id ?? null;

  const handleChange = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    target.value = "";
    if (file) props.onOpenFile(file);
  };

  return (
    <header class="h-full px-6">
      <div class="grid h-full grid-cols-[1fr_auto] items-center gap-4">
        <div class="flex min-w-0 items-center justify-start gap-2">
          <Show
            when={props.allowOpenFile !== false}
            fallback={
              <Show
                when={props.onSampleChange && sampleImages().length > 0}
                fallback={
                  <span
                    class={`truncate px-1 ${sampleFileNameWidthClassName} ${sampleFileNameTextClassName}`}
                    title={props.fileName ?? "Sample image"}
                  >
                    {props.fileName ?? "Sample image"}
                  </span>
                }
              >
                <div class={sampleFileNameWidthClassName}>
                  <Select<string>
                    disabled={props.loading}
                    options={sampleImages().map((sample) => sample.id)}
                    placeholder="Select a sample image…"
                    placement="bottom-start"
                    value={selectedSampleId() ?? undefined}
                    onChange={(value) => {
                      if (value != null) props.onSampleChange?.(value);
                    }}
                    itemComponent={(props) => (
                      <SelectItem class="font-mono text-xs sm:text-sm" item={props.item}>
                        {sampleImages().find((sample) => sample.id === props.item.rawValue)
                          ?.fileName ?? props.item.rawValue}
                      </SelectItem>
                    )}
                  >
                    <SelectTrigger
                      aria-label="Sample image"
                      class={`w-full min-w-0 max-w-full ${sampleFileNameTextClassName}`}
                      size="sm"
                    >
                      <SelectValue<string>>
                        {(state) =>
                          sampleImages().find((sample) => sample.id === state.selectedOption())
                            ?.fileName
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                </div>
              </Show>
            }
          >
            <input
              ref={inputRef}
              accept={imageAccept}
              aria-label="Choose image file"
              name="image"
              style={{ display: "none" }}
              tabIndex={-1}
              type="file"
              onChange={handleChange}
            />
            <Button
              class="gap-2 font-normal"
              disabled={props.loading}
              size="sm"
              title={props.fileName ?? "Open image"}
              type="button"
              variant="outline"
              onClick={() => inputRef?.click()}
            >
              <IconImageRegular class="size-4 shrink-0 opacity-80" />
              Image
            </Button>
          </Show>
          {props.startTrailing}
        </div>

        <div class="flex min-w-0 items-center justify-end justify-self-end gap-1 sm:gap-2">
          {props.endLeading}
          <Show when={props.showThemeToggle !== false}>
            <ShellThemeToggle />
          </Show>
        </div>
      </div>
    </header>
  );
}

export function DemoNavbarActionButton(props: {
  children: JSX.Element;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      class="gap-2 font-normal"
      disabled={props.disabled}
      size="sm"
      type="button"
      variant="outline"
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}
