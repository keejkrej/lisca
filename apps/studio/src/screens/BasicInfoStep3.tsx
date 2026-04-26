import { Field, FieldLabel, Input, cn } from "lisca/shared/ui";
import {
  basicInfoAssayTitle,
  type BasicInfoSlideId,
  useStudioStore,
} from "../studioStore";

const ROW = "flex min-h-[100px] w-full flex-col gap-2.5 p-2.5";

const SLIDE_OPTIONS: {
  id: BasicInfoSlideId;
  variant: "two-well" | "multi-well";
  polymer: boolean;
  glass: boolean;
}[] = [
  { id: "slide-1", variant: "two-well", polymer: true, glass: false },
  { id: "slide-2", variant: "two-well", polymer: true, glass: false },
  { id: "slide-3", variant: "multi-well", polymer: true, glass: true },
  { id: "slide-4", variant: "multi-well", polymer: true, glass: true },
];

function SlideThumb({ variant }: { variant: "two-well" | "multi-well" }) {
  if (variant === "two-well") {
    return (
      <div className="flex h-[72px] w-full items-center justify-center gap-3 px-2">
        <div className="size-9 rounded-full border-2 border-foreground/50 bg-muted/40" />
        <div className="size-9 rounded-full border-2 border-foreground/50 bg-muted/40" />
      </div>
    );
  }
  return (
    <div className="grid h-[72px] w-full grid-cols-3 grid-rows-2 gap-1 px-2 py-1">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="min-h-0 rounded-sm border border-foreground/40 bg-muted/30"
        />
      ))}
    </div>
  );
}

function CoverslipBadges({ polymer, glass }: { polymer: boolean; glass: boolean }) {
  return (
    <div className="flex w-full flex-wrap justify-center gap-1 px-1">
      {polymer ? (
        <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">
          Polymer coverslip
        </span>
      ) : null}
      {glass ? (
        <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">
          Glass coverslip
        </span>
      ) : null}
    </div>
  );
}

/** Third part of Basic info — Figma node 78:284 (Slide + Samples). */
export function BasicInfoStep3() {
  const assayId = useStudioStore((s) => s.assayId);
  const info3 = useStudioStore((s) => s.info3);
  const setInfo3 = useStudioStore((s) => s.setInfo3);
  const updateInfo3Sample = useStudioStore((s) => s.updateInfo3Sample);

  return (
    <div className="flex w-full min-w-0 flex-col gap-[30px]">
      <h1 className="text-center font-normal text-4xl leading-tight text-foreground">
        {basicInfoAssayTitle(assayId)}
      </h1>

      <div className="flex w-full min-w-0 flex-col gap-2.5">
        <div className={ROW}>
          <Field className="gap-2.5" name="slide">
            <FieldLabel className="text-2xl font-normal">Slide</FieldLabel>
            <div
              className="mt-0 flex w-full min-w-0 flex-wrap gap-2.5 sm:flex-nowrap"
              role="listbox"
              aria-label="Slide type"
            >
              {SLIDE_OPTIONS.map(({ id, variant, polymer, glass }) => {
                const selected = info3.selectedSlideId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex min-h-[140px] min-w-0 flex-1 flex-col items-stretch justify-between gap-2 rounded-2xl border-2 p-2.5 transition-shadow",
                      selected
                        ? "border-foreground/80 ring-1 ring-foreground/20"
                        : "border-border opacity-70 hover:opacity-100",
                    )}
                    onClick={() => setInfo3({ selectedSlideId: id })}
                  >
                    <SlideThumb variant={variant} />
                    <CoverslipBadges polymer={polymer} glass={glass} />
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className={cn(ROW, "min-h-0")}>
          <Field className="min-h-0 gap-2.5" name="samples">
            <FieldLabel className="text-2xl font-normal">Samples</FieldLabel>
            <div className="mt-0 w-full min-w-0 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[28rem] border-collapse text-left text-base">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2.5 font-medium text-foreground" scope="col">
                      channel
                    </th>
                    <th className="px-3 py-2.5 font-medium text-foreground" scope="col">
                      name
                    </th>
                    <th className="px-3 py-2.5 font-medium text-foreground" scope="col">
                      positions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {info3.samples.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-border/80 last:border-b-0 odd:bg-background even:bg-muted/10"
                    >
                      <td className="p-1.5 align-middle">
                        <Input
                          aria-label={`Channel row ${index}`}
                          autoComplete="off"
                          className="h-10 w-full min-w-[4rem] border-0 bg-transparent shadow-none focus-visible:ring-1"
                          value={row.channel}
                          onChange={(e) =>
                            updateInfo3Sample(index, { channel: e.target.value })
                          }
                        />
                      </td>
                      <td className="p-1.5 align-middle">
                        <Input
                          aria-label={`Name row ${index}`}
                          autoComplete="off"
                          className="h-10 w-full min-w-[6rem] border-0 bg-transparent shadow-none focus-visible:ring-1"
                          value={row.name}
                          onChange={(e) =>
                            updateInfo3Sample(index, { name: e.target.value })
                          }
                        />
                      </td>
                      <td className="p-1.5 align-middle">
                        <Input
                          aria-label={`Positions row ${index}`}
                          autoComplete="off"
                          className="h-10 w-full min-w-[6rem] border-0 bg-transparent shadow-none focus-visible:ring-1"
                          value={row.positions}
                          onChange={(e) =>
                            updateInfo3Sample(index, { positions: e.target.value })
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
    </div>
  );
}
