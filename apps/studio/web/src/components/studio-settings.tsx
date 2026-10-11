import {
  Button,
  ComingSoonTooltip,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lisca/ui/components";
import { DialogSurface, ModalScrim, StartupUpdateCheck } from "@lisca/ui/shell";
import IconGearRegular from "phosphor-icons-solid/IconGearRegular";
import { createSignal, Show } from "solid-js";

function InferenceSettings() {
  return (
    <div class="flex flex-col gap-4">
      <p class="text-sm text-muted-foreground">
        Connect to a server to see the models it provides and which assays are inference-ready. No
        inference server ships in this version, so no assay is inference-ready.
      </p>
      <ComingSoonTooltip class="flex w-full">
        <fieldset
          class="pointer-events-none flex w-full min-w-0 flex-col gap-3"
          data-unavailable=""
          disabled
        >
          <FieldGroup class="gap-3">
            <Field>
              <FieldLabel for="inference-settings-url">Server address</FieldLabel>
              <Input
                disabled
                id="inference-settings-url"
                placeholder="https://"
                type="url"
                value=""
              />
            </Field>
            <Field>
              <FieldLabel for="inference-settings-token">Server token</FieldLabel>
              <Input
                autocomplete="off"
                disabled
                id="inference-settings-token"
                type="password"
                value=""
              />
            </Field>
          </FieldGroup>
          <Button
            class="pointer-events-none self-start"
            data-unavailable=""
            disabled
            type="button"
            variant="outline"
          >
            Test connection
          </Button>
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium text-foreground">Models</p>
            <p class="text-sm text-muted-foreground">None</p>
          </div>
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium text-foreground">Assays</p>
            <p class="text-sm text-muted-foreground">No assay is inference-ready.</p>
          </div>
        </fieldset>
      </ComingSoonTooltip>
    </div>
  );
}

/** Studio settings. Inference stays deferred until a server ships with the model tools. */
export function StudioSettings() {
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
          <DialogSurface aria-labelledby="studio-settings-title" class="gap-4 p-5" maxWidth="lg">
            <h2 id="studio-settings-title" class="font-medium text-foreground">
              Settings
            </h2>
            <Tabs defaultValue="updates">
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger class="px-3 py-1.5 text-sm" value="updates">
                  Updates
                </TabsTrigger>
                <TabsTrigger class="px-3 py-1.5 text-sm" value="inference">
                  Inference
                </TabsTrigger>
              </TabsList>
              <TabsContent class="pt-4" value="updates">
                <StartupUpdateCheck />
              </TabsContent>
              <TabsContent class="pt-4" value="inference">
                <InferenceSettings />
              </TabsContent>
            </Tabs>
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
