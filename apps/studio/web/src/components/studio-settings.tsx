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
import { createInferenceClient } from "@lisca/client/inference";
import { runClientEffect } from "@lisca/client/runtime";
import type { LabelFreeHealth } from "@lisca/contracts";
import { createResource, createSignal, Match, Show, Switch } from "solid-js";

import { studioClient, toErrorMessage } from "../api/studio-port";

type SettingsSection = "updates" | "inference";

type EmbeddedStatus =
  | { kind: "light" }
  | { kind: "label-free"; health: LabelFreeHealth }
  | { kind: "error"; message: string };

async function loadEmbeddedStatus(): Promise<EmbeddedStatus> {
  try {
    const health = await runClientEffect(studioClient.labelFreeHealth());
    if (health.apiVersion !== 1 || health.runtime !== "embedded") {
      return { kind: "error", message: "The Studio server returned an unknown inference build." };
    }
    if (health.build === "light") return { kind: "light" };
    return { kind: "label-free", health };
  } catch (error) {
    return {
      kind: "error",
      message: toErrorMessage(error, "Could not reach the Studio server"),
    };
  }
}

function InferenceSettings() {
  const [status] = createResource(loadEmbeddedStatus);
  const [url, setUrl] = createSignal("");
  const [token, setToken] = createSignal("");
  const [hostMessage, setHostMessage] = createSignal<string | null>(null);
  const [testing, setTesting] = createSignal(false);

  const labelFreeHealth = () => {
    const current = status();
    return current?.kind === "label-free" ? current.health : undefined;
  };
  const errorMessage = () => {
    const current = status();
    return current?.kind === "error" ? current.message : undefined;
  };
  const modelLabel = () => {
    const health = labelFreeHealth();
    return health?.modelId && health.revision
      ? `${health.modelId} ${health.revision}`
      : "None in this build";
  };

  const testHost = async () => {
    setTesting(true);
    setHostMessage(null);
    try {
      const health = await createInferenceClient({ url: url(), token: token() }).health();
      setHostMessage(`${health.model_id} · ${health.device} · ${health.dimensions} dimensions`);
    } catch (error) {
      setHostMessage(error instanceof Error ? error.message : "Could not reach the Python host.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div class="flex flex-col gap-4">
      <Switch fallback={<p class="text-sm text-muted-foreground">Checking this Studio build.</p>}>
        <Match when={status()?.kind === "light"}>
          <p class="text-sm text-muted-foreground">
            This is the light Studio build. Fluorescence assays run on this computer. The heavier
            build bundles the CUDA runtime and turns label-free embedding on.
          </p>
        </Match>
        <Match when={labelFreeHealth()}>
          {(health) => (
            <div class="flex flex-col gap-2">
              <p class="text-sm text-muted-foreground">
                Label-free embedding is on. Annotate a few classifications, then Analysis embeds
                those frames with {health().modelId} {health().revision} and uses them as the
                reference set. This encoder runs on the CPU.
              </p>
              <p class="text-sm text-muted-foreground">
                {health().cudaBundled
                  ? "The CUDA ONNX runtime is bundled with this build."
                  : "This label-free build does not bundle the CUDA runtime."}
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
        <p class="text-sm font-medium text-foreground">Embedded model</p>
        <p class="text-sm text-muted-foreground">{modelLabel()}</p>
      </div>
      <FieldGroup class="gap-3">
        <p class="text-sm text-muted-foreground">
          An independent Python server can still host EmbeddingGemma. Leave the token in this page.
        </p>
        <Field>
          <FieldLabel for="inference-settings-url">Server address</FieldLabel>
          <Input
            id="inference-settings-url"
            placeholder="https://"
            type="url"
            value={url()}
            onInput={(event) => setUrl(event.currentTarget.value)}
          />
        </Field>
        <Field>
          <FieldLabel for="inference-settings-token">Server token</FieldLabel>
          <Input
            autocomplete="off"
            id="inference-settings-token"
            type="password"
            value={token()}
            onInput={(event) => setToken(event.currentTarget.value)}
          />
        </Field>
      </FieldGroup>
      <Button
        class="self-start"
        disabled={testing()}
        type="button"
        variant="outline"
        onClick={() => void testHost()}
      >
        Test connection
      </Button>
      <Show when={hostMessage()}>
        <p class="text-sm text-muted-foreground" role="status">
          {hostMessage()}
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

/** Studio settings. Inference reports the embedded build and can test a Python host. */
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
                  Startup updates and the inference server.
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
