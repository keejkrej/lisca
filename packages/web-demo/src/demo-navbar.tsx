import { Button } from "@lisca/ui/components";
import { ShellThemeToggle } from "@lisca/ui/shell";
import { ImageIcon } from "lucide-react";
import { useRef, type ChangeEvent, type ReactNode } from "react";

const imageAccept = ".png,.jpg,.jpeg,.tif,.tiff,image/png,image/jpeg,image/tiff";

export type DemoNavbarProps = {
  fileName: string | null;
  loading?: boolean;
  endLeading?: ReactNode;
  onOpenFile: (file: File) => void;
};

export function DemoNavbar(props: DemoNavbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) props.onOpenFile(file);
  };

  return (
    <header className="h-full px-6">
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex min-w-0 items-center justify-start">
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
        </div>

        <div />

        <div className="flex min-w-0 items-center justify-end justify-self-end gap-1 sm:gap-2">
          {props.endLeading}
          <ShellThemeToggle />
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
