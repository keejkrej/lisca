import IconGearRegular from "phosphor-icons-solid/IconGearRegular";
import { createSignal, onMount, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { Toggle } from "../../components/ui/toggle";
import { AlignStateToggleIndicator } from "../../features/align/align-state-toggle-indicator";
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
 * Startup update check. The checkbox is on until it is turned off. The web app
 * has no updater, so this panel only explains that the desktop app checks.
 */
export function StartupUpdateCheck() {
  const bridge = desktopUpdateBridge();
  const product = PRODUCT_LABEL[bridge?.product ?? ""] ?? "this app";
  const [enabled, setEnabled] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    if (!bridge) return;
    void bridge.updateCheckEnabled().then(setEnabled, (cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  });

  const change = (next: boolean) => {
    if (!bridge) return;
    const previous = enabled();
    setEnabled(next);
    setError(null);
    void bridge.setUpdateCheckEnabled(next).catch((cause: unknown) => {
      setEnabled(previous);
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  };

  return (
    <div class="flex flex-col gap-4">
      <p class="text-sm text-muted-foreground">
        {bridge
          ? `Each launch of ${product} looks for a newer release. The download starts only after you choose Install.`
          : "The desktop app checks for updates at startup. The download starts only after you choose Install."}
      </p>
      <Show when={bridge}>
        <Toggle
          aria-label="Check for updates on startup"
          aria-pressed={enabled()}
          class="h-8 w-fit gap-2 px-2.5 text-sm [&_.lisca-instrument-toggle-indicator]:inline-flex"
          data-instrument-state-toggle=""
          pressed={enabled()}
          size="sm"
          variant="outline"
          onChange={change}
        >
          <AlignStateToggleIndicator pressed={enabled()} />
          <span>Check for updates on startup</span>
        </Toggle>
      </Show>
      <Show when={error()}>
        {(message) => (
          <p class="z-destructive-surface text-sm" role="alert">
            {message()}
          </p>
        )}
      </Show>
    </div>
  );
}

/**
 * Desktop-only settings for Aligner and Annotator. The web app has no updater,
 * so the button stays hidden there. Studio uses its own tabbed settings dialog.
 */
export function DesktopUpdateSettings() {
  const bridge = desktopUpdateBridge();
  if (!bridge) return null;

  const [open, setOpen] = createSignal(false);

  return (
    <>
      <Button
        aria-label="Settings"
        class="size-7"
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        <IconGearRegular class="size-4" />
      </Button>
      <Show when={open()}>
        <ModalScrim>
          <DialogSurface aria-labelledby="desktop-update-settings-title" class="gap-4 p-5">
            <h2 id="desktop-update-settings-title" class="font-medium text-foreground">
              Settings
            </h2>
            <StartupUpdateCheck />
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
