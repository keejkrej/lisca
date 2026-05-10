import {
  AppShell,
  Button,
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
  ShellNavbar,
  buttonVariants,
  cn,
} from "@lisca/ui";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";

function PanelLabel(props: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center text-sm opacity-70">
      {props.children}
    </div>
  );
}

function ToolsMenuChevron(props: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ToolsMenu() {
  return (
    <Menu>
      <MenuTrigger
        className={cn(
          buttonVariants({
            size: "sm",
            variant: "outline",
            className:
              "group inline-flex w-fit shrink-0 justify-between gap-2 font-normal text-foreground shadow-none hover:bg-muted/40 data-popup-open:bg-muted/60",
          }),
        )}
      >
        Tools
        <ToolsMenuChevron className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[popup-open]:rotate-180" />
      </MenuTrigger>
      <MenuPopup
        align="end"
        className="w-56 rounded-2xl border-border p-2 shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
        side="bottom"
        sideOffset={8}
      >
        <MenuItem className="h-auto min-h-0 flex-col items-stretch gap-0.5 py-2.5 text-left">
          <span className="font-medium text-foreground text-sm">Hello</span>
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

function SourcePickerStub(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props;

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose image source"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="font-semibold text-lg">Open image source</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Placeholder for TIFF / JPEG / ND2 / CZI pickers — logic comes later.
        </p>
        <div className="mt-4 grid gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            TIFF folder
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            JPEG / PNG folder
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            ND2 file
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            CZI file
          </Button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AnnotatorShellPage(props: { routeId: string }) {
  const navigate = useNavigate();
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const closeSourceModal = useCallback(() => setSourceModalOpen(false), []);

  return (
    <>
      <AppShell>
        <AppShell.Header>
          <ShellNavbar
            wsDefaultPort={8766}
            routeItems={[
              { value: "roi", label: "ROI" },
            ]}
            showRouteToggle={false}
            showToolsMenu={true}
            routeValue={props.routeId}
            onRouteChange={(v: string) => navigate({ to: `/${v}` })}
            onPickSource={() => setSourceModalOpen(true)}
            endLeading={<ToolsMenu />}
          />
        </AppShell.Header>
        <AppShell.Body>
          <AppShell.Left>
            <PanelLabel>annotator — left</PanelLabel>
          </AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.Main>
              <PanelLabel>annotator — main ({props.routeId})</PanelLabel>
            </AppShell.Main>
            <AppShell.Dock>
              <PanelLabel>annotator — bottom</PanelLabel>
            </AppShell.Dock>
          </AppShell.MainColumn>
          <AppShell.Right>
            <PanelLabel>annotator — right</PanelLabel>
          </AppShell.Right>
        </AppShell.Body>
      </AppShell>

      <SourcePickerStub open={sourceModalOpen} onClose={closeSourceModal} />
    </>
  );
}
