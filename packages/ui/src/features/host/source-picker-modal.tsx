import IconXRegular from "phosphor-icons-solid/IconXRegular";
import { Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";

export type SourcePickerModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenFolder: () => void | Promise<void>;
  onOpenNd2: () => void | Promise<void>;
  onOpenCzi: () => void | Promise<void>;
};

const optionClass =
  "group flex min-h-24 w-full items-center justify-center rounded-lg border border-border bg-muted/20 px-4 py-5 text-center transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SourcePickerModal(props: SourcePickerModalProps) {
  const handleSelect = async (fn: () => void | Promise<void>) => {
    props.onClose();
    await fn();
  };

  return (
    <Show when={props.open}>
      <ModalScrim
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <DialogSurface aria-labelledby="open-source-title" maxWidth="lg">
          <div class="px-5 pb-3 pt-5">
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <h2 class="font-semibold text-foreground text-lg" id="open-source-title">
                  Open Data
                </h2>
                <p class="text-muted-foreground text-sm">Choose a source format.</p>
              </div>

              <Button
                aria-label="Close open data modal"
                class="shrink-0"
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={props.onClose}
              >
                <IconXRegular class="size-4" />
              </Button>
            </div>
          </div>

          <div class="px-5 pb-5">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                class={optionClass}
                type="button"
                onClick={() => void handleSelect(props.onOpenFolder)}
              >
                <span class="font-medium text-foreground text-lg group-hover:text-primary">
                  Folder
                </span>
              </button>
              <button
                class={optionClass}
                type="button"
                onClick={() => void handleSelect(props.onOpenNd2)}
              >
                <span class="font-medium text-foreground text-lg group-hover:text-primary">
                  ND2
                </span>
              </button>
              <button
                class={optionClass}
                type="button"
                onClick={() => void handleSelect(props.onOpenCzi)}
              >
                <span class="font-medium text-foreground text-lg group-hover:text-primary">
                  CZI
                </span>
              </button>
            </div>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}
