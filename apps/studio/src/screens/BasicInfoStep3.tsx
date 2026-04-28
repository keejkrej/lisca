import {
  Field,
  FieldLabel,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "lisca/shared/ui";
import {
  type BasicInfoSlideId,
  useStudioStore,
} from "../studioStore";
import slideIImage from "../assets/slides/slide-i.webp";
import slideVIImage from "../assets/slides/slide-vi.webp";

const ROW = "flex min-h-[100px] w-full flex-col gap-2.5 p-2.5";

const SLIDE_OPTIONS: {
  id: BasicInfoSlideId;
  label: string;
  image: string;
}[] = [
  { id: "slide-i", label: "Slide I", image: slideIImage },
  { id: "slide-vi", label: "Slide VI", image: slideVIImage },
];

/** Third part of Basic info — Figma node 78:284 (Slide + Samples). */
export function BasicInfoStep3() {
  const info3 = useStudioStore((s) => s.info3);
  const setInfo3 = useStudioStore((s) => s.setInfo3);
  const updateInfo3Sample = useStudioStore((s) => s.updateInfo3Sample);
  const activeSamples = info3.samplesBySlide[info3.selectedSlideId];

  return (
    <div className="flex w-full min-w-0 flex-col gap-[30px]">
      <div className="flex w-full min-w-0 flex-col gap-2.5">
        <div className={ROW}>
          <Field className="gap-2.5" name="slide">
            <FieldLabel className="text-2xl font-normal">Slide</FieldLabel>
            <div
              className="mt-0 flex w-full min-w-0 flex-wrap gap-2.5 sm:flex-nowrap"
              role="listbox"
              aria-label="Slide type"
            >
              {SLIDE_OPTIONS.map(({ id, label, image }) => {
                const selected = info3.selectedSlideId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex min-h-[160px] min-w-0 flex-1 flex-col items-stretch justify-between gap-2 rounded-lg border-2 bg-background p-2.5 transition-shadow",
                      selected
                        ? "border-foreground/80 ring-1 ring-foreground/20"
                        : "border-border opacity-70 hover:opacity-100",
                    )}
                    onClick={() => setInfo3({ selectedSlideId: id })}
                  >
                    <span className="flex min-h-[112px] w-full items-center justify-center rounded-md bg-muted/20 p-2">
                      <img
                        alt=""
                        className="h-full max-h-[108px] w-full object-contain"
                        src={image}
                      />
                    </span>
                    <span className="text-center text-base font-medium text-foreground">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className={cn(ROW, "min-h-0")}>
          <Field className="min-h-0 gap-2.5" name="samples">
            <FieldLabel className="text-2xl font-normal">Samples</FieldLabel>
            <div className="mt-0 w-full min-w-0">
              <Table className="w-full min-w-[28rem] table-fixed text-base">
                <TableHeader className="block [&_tr]:table [&_tr]:w-full [&_tr]:table-fixed">
                  <TableRow>
                    <TableHead scope="col">
                      channel
                    </TableHead>
                    <TableHead scope="col">
                      name
                    </TableHead>
                    <TableHead scope="col">
                      positions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="block max-h-[9.75rem] overflow-y-auto overflow-x-hidden [&_tr]:table [&_tr]:w-full [&_tr]:table-fixed">
                  {activeSamples.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          aria-label={`Channel row ${index}`}
                          autoComplete="off"
                          className="w-full min-w-[4rem]"
                          value={row.channel}
                          onChange={(e) =>
                            updateInfo3Sample(index, { channel: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Name row ${index}`}
                          autoComplete="off"
                          className="w-full min-w-[6rem]"
                          value={row.name}
                          onChange={(e) =>
                            updateInfo3Sample(index, { name: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Positions row ${index}`}
                          autoComplete="off"
                          className="w-full min-w-[6rem]"
                          value={row.positions}
                          onChange={(e) =>
                            updateInfo3Sample(index, { positions: e.target.value })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}
