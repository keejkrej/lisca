import { Field, FieldLabel, Input, cn } from "@lisca/ui";

import slideIImage from "../assets/slides/slide-i.webp";
import slideVIImage from "../assets/slides/slide-vi.webp";
import { type BasicInfoSlideId, useStudioStore } from "../state/studio-store";

const ROW = "flex min-h-[100px] w-full flex-col gap-2.5 p-2.5";
const SLIDE_OPTIONS: { id: BasicInfoSlideId; label: string; image: string }[] = [
  { id: "slide-i", label: "Slide I", image: slideIImage },
  { id: "slide-vi", label: "Slide VI", image: slideVIImage },
];

export function BasicInfoStep3() {
  const info3 = useStudioStore((state) => state.info3);
  const setInfo3 = useStudioStore((state) => state.setInfo3);
  const updateInfo3Sample = useStudioStore((state) => state.updateInfo3Sample);
  const activeSamples = info3.samplesBySlide[info3.selectedSlideId];

  return (
    <div className="flex w-full min-w-0 flex-col gap-[30px]">
      <div className={ROW}>
        <Field className="gap-2.5" name="slide">
          <FieldLabel className="text-2xl font-normal">Slide</FieldLabel>
          <div
            aria-label="Slide type"
            className="mt-0 flex w-full min-w-0 flex-wrap gap-2.5 sm:flex-nowrap"
            role="listbox"
          >
            {SLIDE_OPTIONS.map(({ id, label, image }) => {
              const selected = info3.selectedSlideId === id;
              return (
                <button
                  key={id}
                  aria-selected={selected}
                  className={cn(
                    "flex min-h-[160px] min-w-0 flex-1 flex-col items-stretch justify-between gap-2 rounded-lg border-2 bg-background p-2.5 transition-shadow",
                    selected
                      ? "border-foreground/80 ring-1 ring-foreground/20"
                      : "border-border opacity-70 hover:opacity-100",
                  )}
                  role="option"
                  type="button"
                  onClick={() => setInfo3({ selectedSlideId: id })}
                >
                  <span className="flex min-h-[112px] w-full items-center justify-center rounded-md bg-muted/20 p-2">
                    <img
                      alt=""
                      className="h-full max-h-[108px] w-full object-contain"
                      src={image}
                    />
                  </span>
                  <span className="text-center font-medium text-base text-foreground">{label}</span>
                </button>
              );
            })}
          </div>
        </Field>
      </div>
      <div className={cn(ROW, "min-h-0")}>
        <Field className="min-h-0 gap-2.5" name="samples">
          <FieldLabel className="text-2xl font-normal">Samples</FieldLabel>
          <div className="mt-0 w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[28rem] table-fixed border-separate border-spacing-0 text-base">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="border-b border-border px-2 py-2 font-medium">channel</th>
                  <th className="border-b border-border px-2 py-2 font-medium">name</th>
                  <th className="border-b border-border px-2 py-2 font-medium">positions</th>
                </tr>
              </thead>
              <tbody>
                {activeSamples.map((row, index) => (
                  <tr key={index}>
                    <td className="px-2 py-1.5">
                      <Input
                        aria-label={`Channel row ${index + 1}`}
                        autoComplete="off"
                        className="w-full min-w-[4rem]"
                        value={row.channel}
                        onChange={(event) =>
                          updateInfo3Sample(index, { channel: event.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        aria-label={`Name row ${index + 1}`}
                        autoComplete="off"
                        className="w-full min-w-[6rem]"
                        value={row.name}
                        onChange={(event) => updateInfo3Sample(index, { name: event.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        aria-label={`Positions row ${index + 1}`}
                        autoComplete="off"
                        className="w-full min-w-[6rem]"
                        value={row.positions}
                        onChange={(event) =>
                          updateInfo3Sample(index, { positions: event.target.value })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Field>
      </div>
    </div>
  );
}
