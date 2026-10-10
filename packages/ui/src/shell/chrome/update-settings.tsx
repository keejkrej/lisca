import IconGearRegular from "phosphor-icons-solid/IconGearRegular";
import { createSignal, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { Toggle } from "../../components/ui/toggle";
import { DialogSurface } from "../modal/dialog-surface";
import { ModalScrim } from "../modal/modal-scrim";

type UpdateBridge = {
  product?: string;
  updateCheckEnabled: () => Promise<boolean>;
  setUpdateCheckEnabled: (enabled: boolean) => Promise<void>;
};

const PRODUCT_LABEL: Record<string, string> = {
  aligner: "Aligner",
  annotator: "Annotator",
  studio: "Studio",
};

function desktopUpdateBridge(): UpdateBridge | null {
  if (typeof window === "undefined") return null;
  const desktop = (window as Window & { liscaDesktop?: Partial<UpdateBridge> }).liscaDesktop;
  if (!desktop?.updateCheckEnabled || !desktop.setUpdateCheckEnabled) return null;
  return {
    product: desktop.product,
    updateCheckEnabled: desktop.updateCheckEnabled,
    setUpdateCheckEnabled: desktop.setUpdateCheckEnabled,
  };
}

/**
 * Desktop-only settings. The startup update check is on until this switch is
 * turned off. The web app has no updater, so the button stays hidden there.
 */
export function DesktopUpdateSettings() {
  const bridge = desktopUpdateBridge();
  if (!bridge) return null;

  const product = PRODUCT_LABEL[bridge.product ?? ""] ?? "this app";
  const [open, setOpen] = createSignal(false);
  const [enabled, setEnabled] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const load = () => {
    void bridge.updateCheckEnabled().then(setEnabled, (cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  };

  const change = (next: boolean) => {
    const previous = enabled();
    setEnabled(next);
    setError(null);
    void bridge.setUpdateCheckEnabled(next).catch((cause: unknown) => {
      setEnabled(previous);
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  };

  return (
    <>
      <Button
        aria-label="Settings"
        class="size-7"
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => {
          setError(null);
          setOpen(true);
          load();
        }}
      >
        <IconGearRegular class="size-4" />
      </Button>
      <Show when={open()}>
        <ModalScrim>
          <DialogSurface aria-labelledby="desktop-update-settings-title" class="gap-4 p-5">
            <div class="space-y-1">
              <h2 id="desktop-update-settings-title" class="font-medium text-foreground">
                Settings
              </h2>
              <p class="text-sm text-muted-foreground">
                Each launch of {product} looks for a newer release. The download starts only after
                you choose Install.
              </p>
            </div>
            <Toggle
              aria-label="Check for updates on startup"
              class="h-7 gap-2 px-2.5 text-xs"
              pressed={enabled()}
              size="sm"
              variant="outline"
              onChange={change}
            >
              Check for updates on startup
            </Toggle>
            <Show when={error()}>
              {(message) => (
                <p class="z-destructive-surface text-sm" role="alert">
                  {message()}
                </p>
              )}
            </Show>
            <div class="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </DialogSurface>
        </ModalScrim>
      </Show>
    </>
  );
}
