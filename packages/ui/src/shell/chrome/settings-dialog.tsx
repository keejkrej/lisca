import IconGearRegular from "phosphor-icons-solid/IconGearRegular";
import IconXRegular from "phosphor-icons-solid/IconXRegular";
import type { JSX } from "solid-js";
import { createResource, createSignal, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "../../components/ui/sidebar";
import { DialogSurface } from "../../patterns/modal/dialog-surface";
import { ModalScrim } from "../../patterns/modal/modal-scrim";
import { StartupUpdateCheck } from "./update-settings";

type DesktopMcpStatus = {
  product: string;
  enabled: boolean;
  running: boolean;
  url: string;
  token: string;
  toolCount: number;
  claudeCommand: string;
  error?: string | null;
};

type DesktopMcpBridge = {
  product?: string;
  mcpStatus?: () => Promise<DesktopMcpStatus>;
  mcpSetEnabled?: (enabled: boolean) => Promise<DesktopMcpStatus>;
};

const PRODUCT_LABEL: Record<string, string> = {
  aligner: "Aligner",
  annotator: "Annotator",
  studio: "Studio",
};

function desktopMcpBridge(): DesktopMcpBridge | null {
  if (typeof window === "undefined") return null;
  const desktop = (window as Window & { liscaDesktop?: DesktopMcpBridge }).liscaDesktop;
  return desktop ?? null;
}

type SettingsSection = "updates" | "inference" | "agents";

function AgentSettingsPanel(props: { productName: string }) {
  const bridge = desktopMcpBridge();
  const [status, { mutate }] = createResource<DesktopMcpStatus | null>(async () => {
    if (!bridge?.mcpStatus) return null;
    return await bridge.mcpStatus();
  });
  const [busy, setBusy] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const [message, setMessage] = createSignal<string | null>(null);

  const toggle = async () => {
    const current = status();
    if (!bridge?.mcpSetEnabled || !current) return;
    setBusy(true);
    setMessage(null);
    try {
      mutate(await bridge.mcpSetEnabled(!current.enabled));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not change the MCP server.");
    } finally {
      setBusy(false);
    }
  };

  const copyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
    } catch {
      setMessage("Could not copy command to clipboard.");
    }
  };

  return (
    <div class="flex flex-col gap-4">
      <Show
        when={bridge?.mcpStatus}
        fallback={
          <p class="text-sm text-muted-foreground">
            The packaged {props.productName} desktop app can expose MCP to local agents. Hosted{" "}
            {props.productName} does not open a local agent listener.
          </p>
        }
      >
        <p class="text-sm text-muted-foreground">
          Let Claude Code and other MCP clients drive this running {props.productName} app. The
          server listens on loopback only, uses the same live backend as the UI, and requires the
          bearer token below. No Node.js or source checkout is needed.
        </p>
        <Show when={status()}>
          {(current) => (
            <>
              <p class="text-sm text-muted-foreground">
                {current().running
                  ? `MCP is running with ${current().toolCount} tools at ${current().url}`
                  : "MCP is stopped."}
              </p>
              <Button
                class="self-start"
                disabled={busy()}
                type="button"
                variant="outline"
                onClick={() => void toggle()}
              >
                {current().enabled ? "Disable MCP" : "Enable MCP"}
              </Button>
              <Show when={current().enabled}>
                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-medium text-foreground">Connect Claude Code</p>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => void copyCommand(current().claudeCommand)}
                    >
                      {copied() ? "Copied" : "Copy command"}
                    </Button>
                  </div>
                  <p class="text-sm text-muted-foreground">
                    Run this command once in a terminal, then ask Claude to use LiSCA:
                  </p>
                  <code class="block overflow-x-auto whitespace-pre-wrap break-all bg-muted p-3 text-xs text-foreground">
                    {current().claudeCommand}
                  </code>
                </div>
              </Show>
              <Show when={current().error}>
                {(error) => (
                  <p class="text-sm text-destructive" role="alert">
                    {error()}
                  </p>
                )}
              </Show>
            </>
          )}
        </Show>
        <Show when={message()}>
          <p class="text-sm text-destructive" role="alert">
            {message()}
          </p>
        </Show>
      </Show>
    </div>
  );
}

export type ShellSettingsDialogProps = {
  productName?: string;
  inferenceSlot?: JSX.Element;
  triggerVariant?: "ghost" | "outline";
};

/**
 * Shared Settings modal across Studio, Aligner, and Annotator:
 * startup update check, optional label-free inference, and local MCP agent access.
 */
export function ShellSettingsDialog(props: ShellSettingsDialogProps) {
  const bridge = desktopMcpBridge();
  const [open, setOpen] = createSignal(false);
  const [section, setSection] = createSignal<SettingsSection>("updates");

  const resolvedProduct = () =>
    props.productName ?? PRODUCT_LABEL[bridge?.product ?? ""] ?? "LiSCA";

  const subtitle = () =>
    props.inferenceSlot !== undefined
      ? "Startup updates, label-free inference, and local agent access."
      : "Startup updates and local agent access.";

  return (
    <>
      <Button
        aria-label="Settings"
        class="size-7"
        size="icon"
        type="button"
        variant={props.triggerVariant ?? "ghost"}
        onClick={() => setOpen(true)}
      >
        <IconGearRegular class="size-4" />
      </Button>
      <Show when={open()}>
        <ModalScrim>
          <DialogSurface
            aria-labelledby="shell-settings-title"
            class="gap-0 overflow-hidden p-0"
            maxWidth="lg"
          >
            <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div class="space-y-1">
                <h2 id="shell-settings-title" class="font-semibold text-foreground text-lg">
                  Settings
                </h2>
                <p class="text-muted-foreground text-sm">{subtitle()}</p>
              </div>
              <Button
                aria-label="Close Settings"
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <IconXRegular />
              </Button>
            </div>
            <SidebarProvider
              class="min-h-72"
              shortcut={false}
              style={{ "--sidebar-width": "10rem" }}
            >
              <Sidebar class="h-auto border-r border-sidebar-border" collapsible="none">
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu aria-label="Settings">
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            aria-current={section() === "updates" ? "page" : undefined}
                            isActive={section() === "updates"}
                            onClick={() => setSection("updates")}
                          >
                            Updates
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <Show when={props.inferenceSlot !== undefined}>
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              aria-current={section() === "inference" ? "page" : undefined}
                              isActive={section() === "inference"}
                              onClick={() => setSection("inference")}
                            >
                              Inference
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </Show>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            aria-current={section() === "agents" ? "page" : undefined}
                            isActive={section() === "agents"}
                            onClick={() => setSection("agents")}
                          >
                            Agents
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </Sidebar>
              <SidebarInset class="min-w-0 p-5">
                <Show when={section() === "updates"}>
                  <StartupUpdateCheck />
                </Show>
                <Show when={section() === "inference" && props.inferenceSlot !== undefined}>
                  {props.inferenceSlot}
                </Show>
                <Show when={section() === "agents"}>
                  <AgentSettingsPanel productName={resolvedProduct()} />
                </Show>
              </SidebarInset>
            </SidebarProvider>
          </DialogSurface>
        </ModalScrim>
      </Show>
    </>
  );
}
