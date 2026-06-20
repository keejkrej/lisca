import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lisca/ui/components";
import { ShellThemeToggle } from "@lisca/ui/shell";
import { ImageIcon } from "lucide-react";
import { useRef, type ChangeEvent, type ReactNode } from "react";

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
  startTrailing?: ReactNode;
  endLeading?: ReactNode;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const sampleImages = props.sampleImages ?? [];
  const selectedSampleId = props.selectedSampleId ?? sampleImages[0]?.id ?? null;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) props.onOpenFile(file);
  };

  return (
    <header className="h-full px-6">
      <div className="grid h-full grid-cols-[1fr_auto] items-center gap-4">
        <div className="flex min-w-0 items-center justify-start gap-2">
          {props.allowOpenFile !== false ? (
            <>
              <input
                ref={inputRef}
                accept={imageAccept}
                style={{ display: "none" }}
                tabIndex={-1}
                type="file"
                onChange={handleChange}
              />
              <Button
                className="gap-2 font-normal"
                disabled={props.loading}
                loading={props.loading}
                size="sm"
                title={props.fileName ?? "Open image"}
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                <ImageIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                Image
              </Button>
            </>
          ) : props.onSampleChange && sampleImages.length > 0 ? (
            <div className={sampleFileNameWidthClassName}>
              <Select
                disabled={props.loading}
                items={sampleImages.map((sample) => ({
                  value: sample.id,
                  label: sample.fileName,
                }))}
                value={selectedSampleId ?? undefined}
                onValueChange={(value) => {
                  if (value != null) props.onSampleChange?.(value);
                }}
              >
                <SelectTrigger
                  aria-label="Sample image"
                  className={`w-full min-w-0 max-w-full ${sampleFileNameTextClassName}`}
                  size="sm"
                  title={props.fileName ?? undefined}
                >
                  <SelectValue placeholder="Sample image" />
                </SelectTrigger>
                <SelectContent align="start">
                  {sampleImages.map((sample) => (
                    <SelectItem
                      key={sample.id}
                      className="font-mono text-xs sm:text-sm"
                      value={sample.id}
                    >
                      {sample.fileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span
              className={`truncate px-1 ${sampleFileNameWidthClassName} ${sampleFileNameTextClassName}`}
              title={props.fileName ?? "Sample image"}
            >
              {props.fileName ?? "Sample image"}
            </span>
          )}
          {props.startTrailing}
        </div>

        <div className="flex min-w-0 items-center justify-end justify-self-end gap-1 sm:gap-2">
          {props.endLeading}
          {props.showThemeToggle !== false ? <ShellThemeToggle /> : null}
        </div>
      </div>
    </header>
  );
}

export function DemoNavbarActionButton(props: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="gap-2 font-normal"
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
