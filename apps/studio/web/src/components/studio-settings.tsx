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
import type { LabelFreeHealth } from "@lisca/contracts";
import { createResource, createSignal, Match, Show, Switch } from "solid-js";

import { studioClient, toErrorMessage } from "../api/studio-port";

type SettingsSection = "updates" | "inference";

type InferenceStatus =
  | { kind: "ready"; health: LabelFreeHealth }
  | { kind: "error"; message: string };

async function loadInferenceStatus(): Promise<InferenceStatus> {
  try {
    const health = await runClientEffect(studioClient.labelFreeHealth());
    if (health.apiVersion !== 1 || health.provider !== "openrouter") {
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
      const updated = await runClientEffect(studioClient.saveLabelFreeKey(apiKey()));
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

  return (
    <div class="flex flex-col gap-4">
      <Switch fallback={<p class="text-sm text-muted-foreground">Checking OpenRouter status.</p>}>
        <Match when={labelFreeHealth()}>
          {(health) => (
            <div class="flex flex-col gap-2">
              <p class="text-sm text-muted-foreground">
                Label-free assays embed annotated reference frames and sample time series with{" "}
                {health().modelId} via OpenRouter.
              </p>
              <p class="text-sm text-muted-foreground">
                {health().configured
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
      <Show when={saveMessage()}>
        <p class="text-sm text-muted-foreground" role="status">
          {saveMessage()}
        </p>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset class="min-w-0 p-5">
        <Show when={section() === "updates"} fallback={<InferenceSettings />}>
          <StartupUpdateCheck />
        </Show>
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Studio settings. Inference configures the OpenRouter API key for label-free embedding. */
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
                  Startup updates and OpenRouter label-free inference.
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
