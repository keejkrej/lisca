import { Field, FieldLabel, Input, cn } from "@lisca/ui/components";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
import { createMemo, For } from "solid-js";

import slideIImage from "../assets/slides/slide-i.webp";
import slideVIImage from "../assets/slides/slide-vi.webp";
import {
  type BasicInfoSlideId,
  studioWizardActions,
  studioWizardAtom,
} from "../state/studio-store";

const ROW = "flex min-h-[100px] w-full flex-col gap-2.5 p-2.5";
const SLIDE_OPTIONS: { id: BasicInfoSlideId; label: string; image: string }[] = [
  { id: "slide-i", label: "Slide I", image: slideIImage },
  { id: "slide-vi", label: "Slide VI", image: slideVIImage },
];

export function BasicInfoStep3() {
  const wizard = useAtomValue(studioWizardAtom);
  const setWizard = useAtomSet(studioWizardAtom);
  const setInfo3 = (patch: Parameters<typeof studioWizardActions.setInfo3>[1]) =>
    studioWizardActions.setInfo3(setWizard, patch);
  const updateInfo3Sample = (
    index: number,
    patch: Parameters<typeof studioWizardActions.updateInfo3Sample>[2],
  ) => studioWizardActions.updateInfo3Sample(setWizard, index, patch);

  const activeSamples = createMemo(
    () => wizard().info3.samplesBySlide[wizard().info3.selectedSlideId],
  );

  return (
    <div class="flex w-full min-w-0 flex-col gap-[30px]">
      <div class={ROW}>
        <Field class="gap-2.5" name="slide">
          <FieldLabel class="text-2xl font-normal">Slide</FieldLabel>
          <div
            aria-label="Slide type"
            class="mt-0 flex w-full min-w-0 flex-wrap gap-2.5 sm:flex-nowrap"
            role="listbox"
          >
            <For each={SLIDE_OPTIONS}>
              {({ id, label, image }) => {
                const selected = () => wizard().info3.selectedSlideId === id;
                return (
                  <button
                    aria-selected={selected()}
                    class={cn(
                      "flex min-h-[160px] min-w-0 flex-1 flex-col items-stretch justify-between gap-2 rounded-lg border-2 bg-background p-2.5 transition-shadow",
                      selected()
                        ? "border-foreground/80 ring-1 ring-foreground/20"
                        : "border-border opacity-70 hover:opacity-100",
                    )}
                    role="option"
                    type="button"
                    onClick={() => setInfo3({ selectedSlideId: id })}
                  >
                    <span class="flex min-h-[112px] w-full items-center justify-center rounded-md bg-muted/20 p-2">
                      <img
                        alt=""
                        class="h-full max-h-[108px] w-full object-contain"
                        src={image}
                      />
                    </span>
                    <span class="text-center font-medium text-base text-foreground">{label}</span>
                  </button>
                );
              }}
            </For>
          </div>
        </Field>
      </div>
      <div class={cn(ROW, "min-h-0")}>
        <Field class="min-h-0 gap-2.5" name="samples">
          <FieldLabel class="text-2xl font-normal">Samples</FieldLabel>
          <p class="text-muted-foreground text-sm">
            Position start and finish use 1-based indexing (Pos1, Pos2, …).
          </p>
          <div class="mt-0 w-full min-w-0 overflow-x-auto">
            <table class="w-full min-w-[44rem] table-fixed border-separate border-spacing-0 text-base">
              <thead>
                <tr class="text-left text-sm text-muted-foreground">
                  <th class="border-b border-border px-2 py-2 font-medium">Channel</th>
                  <th class="border-b border-border px-2 py-2 font-medium">Name</th>
                  <th class="border-b border-border px-2 py-2 font-medium">Start</th>
                  <th class="border-b border-border px-2 py-2 font-medium">Finish</th>
                  <th class="border-b border-border px-2 py-2 font-medium">Mask channel</th>
                  <th class="border-b border-border px-2 py-2 font-medium">Signal channel</th>
                </tr>
              </thead>
              <tbody>
                <For each={activeSamples()}>
                  {(row, index) => (
                    <tr>
                      <td class="px-2 py-1.5">
                        <Input
                          aria-label={`Channel row ${index() + 1}`}
                          autocomplete="off"
                          class="w-full"
                          inputMode="numeric"
                          value={row.channel}
                          onChange={(event) =>
                            updateInfo3Sample(index(), { channel: event.currentTarget.value })
                          }
                        />
                      </td>
                      <td class="px-2 py-1.5">
                        <Input
                          aria-label={`Name row ${index() + 1}`}
                          autocomplete="off"
                          class="w-full"
                          value={row.name}
                          onChange={(event) =>
                            updateInfo3Sample(index(), { name: event.currentTarget.value })
                          }
                        />
                      </td>
                      <td class="px-2 py-1.5">
                        <Input
                          aria-label={`Position start row ${index() + 1}`}
                          autocomplete="off"
                          class="w-full"
                          inputMode="numeric"
                          value={row.positionStart}
                          onChange={(event) =>
                            updateInfo3Sample(index(), { positionStart: event.currentTarget.value })
                          }
                        />
                      </td>
                      <td class="px-2 py-1.5">
                        <Input
                          aria-label={`Position finish row ${index() + 1}`}
                          autocomplete="off"
                          class="w-full"
                          inputMode="numeric"
                          value={row.positionFinish}
                          onChange={(event) =>
                            updateInfo3Sample(index(), { positionFinish: event.currentTarget.value })
                          }
                        />
                      </td>
                      <td class="px-2 py-1.5">
                        <Input
                          aria-label={`Mask channel row ${index() + 1}`}
                          autocomplete="off"
                          class="w-full"
                          inputMode="numeric"
                          value={row.maskChannel}
                          onChange={(event) =>
                            updateInfo3Sample(index(), { maskChannel: event.currentTarget.value })
                          }
                        />
                      </td>
                      <td class="px-2 py-1.5">
                        <Input
                          aria-label={`Signal channel row ${index() + 1}`}
                          autocomplete="off"
                          class="w-full"
                          inputMode="numeric"
                          value={row.signalChannel}
                          onChange={(event) =>
                            updateInfo3Sample(index(), { signalChannel: event.currentTarget.value })
                          }
                        />
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Field>
      </div>
    </div>
  );
}