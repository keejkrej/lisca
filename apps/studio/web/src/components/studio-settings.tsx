import {
  Button,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@lisca/ui/primitives";
import { StartupUpdateCheck } from "@lisca/ui/shell";
import { DialogSurface, ModalScrim } from "@lisca/ui/patterns";
import IconGearRegular from "phosphor-icons-solid/IconGearRegular";
import IconXRegular from "phosphor-icons-solid/IconXRegular";
import { runClientEffect } from "@lisca/client/runtime";
import { liscaDesktopBridge } from "@lisca/client/desktop";
import type { LiscaDesktopMcpStatus } from "@lisca/client/desktop";
import type { LabelFreeHealth } from "@lisca/contracts";
import { createResource, createSignal, Match, Show, Switch } from "solid-js";

import { studioClient, toErrorMessage } from "../api/studio-port";

type SettingsSection = "updates" | "inference" | "agents";

type InferenceStatus =
  | { kind: "ready"; health: LabelFreeHealth }
  | { kind: "error"; message: string };

async function loadInferenceStatus(): Promise<InferenceStatus> {
  try {
    const health = await runClientEffect(studioClient.labelFreeHealth());
    if (health.apiVersion !== 1 || !["openrouter", "ollama"].includes(health.provider)) {
      return {
        kind: "error",
        message: "The Studio server returned an unknown inference provider.",
      };
    }
    return { kind: "ready", health };
  } catch (error) {
    return {
      kind: "error",
      message: toErrorMessage(error, "Could not reach the Studio server"),
    };
  }
}

function InferenceSettings() {
  const [status, { mutate }] = createResource(loadInferenceStatus);
  const [apiKey, setApiKey] = createSignal("");
  const [saveMessage, setSaveMessage] = createSignal<string | null>(null);
  const [saving, setSaving] = createSignal(false);

  const labelFreeHealth = () => {
    const current = status();
    return current?.kind === "ready" ? current.health : undefined;
  };
  const errorMessage = () => {
    const current = status();
    return current?.kind === "error" ? current.message : undefined;
  };
  const modelLabel = () => {
    const health = labelFreeHealth();
    return health ? `${health.modelId} (${health.dimensions} dimensions)` : "Checking...";
  };

  const saveKey = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await runClientEffect(studioClient.saveLabelFreeKey(apiKey(), "openrouter"));
      mutate({ kind: "ready", health: updated });
      setApiKey("");
      setSaveMessage(
        updated.configured
          ? "OpenRouter API key saved for this session."
          : "OpenRouter API key cleared.",
      );
    } catch (error) {
      setSaveMessage(toErrorMessage(error, "Could not save the OpenRouter API key."));
    } finally {
      setSaving(false);
    }
  };

  const selectProvider = async (provider: "openrouter" | "ollama") => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await runClientEffect(studioClient.saveLabelFreeKey(undefined, provider));
      mutate({ kind: "ready", health: updated });
      setSaveMessage(
        provider === "ollama"
          ? "Using the local Ollama server at LISCA_OLLAMA_URL (default http://127.0.0.1:11434)."
          : "Using OpenRouter for label-free embeddings.",
      );
    } catch (error) {
      setSaveMessage(toErrorMessage(error, "Could not change the embedding provider."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="flex flex-col gap-4">
      <Switch fallback={<p class="text-sm text-muted-foreground">Checking OpenRouter status.</p>}>
        <Match when={labelFreeHealth()}>
          {(health) => (
            <div class="flex flex-col gap-2">
              <p class="text-sm text-muted-foreground">
                Label-free assays embed annotated reference frames and sample time series with{" "}
                {health().modelId} via{" "}
                {health().provider === "ollama" ? "local Ollama" : "OpenRouter"}.
              </p>
              <p class="text-sm text-muted-foreground">
                {health().provider === "ollama"
                  ? "Local inference needs no API key. Pull embeddinggemma-2 in Ollama before building a reference set."
                  : health().configured
                    ? "OpenRouter API key is configured."
                    : "No OpenRouter API key is configured yet. Enter a key below to enable label-free embedding."}
              </p>
            </div>
          )}
        </Match>
        <Match when={errorMessage()}>
          {(message) => (
            <p class="text-sm text-muted-foreground" role="alert">
              {message()}
            </p>
          )}
        </Match>
      </Switch>
      <div class="flex flex-col gap-1">
        <p class="text-sm font-medium text-foreground">Embedding model</p>
        <p class="text-sm text-muted-foreground">{modelLabel()}</p>
      </div>
      <div class="flex gap-2" aria-label="Embedding provider">
        <Button
          disabled={saving()}
          size="sm"
          type="button"
          variant={labelFreeHealth()?.provider === "openrouter" ? "default" : "outline"}
          onClick={() => void selectProvider("openrouter")}
        >
          OpenRouter
        </Button>
        <Button
          disabled={saving()}
          size="sm"
          type="button"
          variant={labelFreeHealth()?.provider === "ollama" ? "default" : "outline"}
          onClick={() => void selectProvider("ollama")}
        >
          Local Ollama
        </Button>
      </div>
      <Show when={labelFreeHealth()?.provider !== "ollama"}>
        <FieldGroup class="gap-3">
          <Field>
            <FieldLabel for="inference-settings-openrouter-key">OpenRouter API key</FieldLabel>
            <Input
              autocomplete="off"
              id="inference-settings-openrouter-key"
              placeholder="sk-or-v1-..."
              type="password"
              value={apiKey()}
              onInput={(event) => setApiKey(event.currentTarget.value)}
            />
          </Field>
        </FieldGroup>
        <Button
          class="self-start"
          disabled={saving()}
          type="button"
          variant="outline"
          onClick={() => void saveKey()}
        >
          Save API key
        </Button>
      </Show>
      <Show when={saveMessage()}>
        <p class="text-sm text-muted-foreground" role="status">
          {saveMessage()}
        </p>
      </Show>
    </div>
  );
}

function AgentSettings() {
  const bridge = liscaDesktopBridge();
  const [status, { mutate }] = createResource<LiscaDesktopMcpStatus | null>(async () => {
    if (!bridge?.mcpStatus) return null;
    return await bridge.mcpStatus();
  });
  const [busy, setBusy] = createSignal(false);
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

  return (
    <div class="flex flex-col gap-4">
      <Show
        when={bridge}
        fallback={
          <p class="text-sm text-muted-foreground">
            The packaged desktop app can expose MCP to local agents. Hosted Studio does not open a
            local agent listener.
          </p>
        }
      >
        <p class="text-sm text-muted-foreground">
          Let Claude Code and other MCP clients drive this running Studio app. The server listens on
          loopback only, uses the same live backend as the UI, and requires the bearer token below.
          No Node.js or source checkout is needed.
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
                  <p class="text-sm font-medium text-foreground">Connect Claude Code</p>
                  <p class="text-sm text-muted-foreground">
                    Run this command once in a terminal, then ask Claude to use LiSCA:
                  </p>
                  <code class="block overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs text-foreground">
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

function SettingsSections() {
  const [section, setSection] = createSignal<SettingsSection>("updates");

  return (
    <SidebarProvider class="min-h-72" shortcut={false} style={{ "--sidebar-width": "10rem" }}>
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
                <SidebarMenuItem>
                  <SidebarMenuButton
                    aria-current={section() === "inference" ? "page" : undefined}
                    isActive={section() === "inference"}
                    onClick={() => setSection("inference")}
                  >
                    Inference
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
        <Show when={section() === "inference"}>
          <InferenceSettings />
        </Show>
        <Show when={section() === "agents"}>
          <AgentSettings />
        </Show>
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Studio settings: updates, label-free inference, and local agent access. */
export function StudioSettings() {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <Button
        aria-label="Settings"
        class="size-7"
        size="icon"
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <IconGearRegular class="size-4" />
      </Button>
      <Show when={open()}>
        <ModalScrim>
          <DialogSurface
            aria-labelledby="studio-settings-title"
            class="gap-0 overflow-hidden p-0"
            maxWidth="lg"
          >
            <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div class="space-y-1">
                <h2 id="studio-settings-title" class="font-semibold text-foreground text-lg">
                  Settings
                </h2>
                <p class="text-muted-foreground text-sm">
                  Startup updates, label-free inference, and local agent access.
                </p>
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
            <SettingsSections />
          </DialogSurface>
        </ModalScrim>
      </Show>
    </>
  );
}
