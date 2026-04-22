import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStudioStore } from "../studioStore";

const TILE =
  "aspect-square w-full min-h-0 min-w-0 max-w-[8.625rem] rounded-lg border border-dashed border-border/80 bg-muted/30 sm:max-w-[8.6rem]";

function GallerySlot({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center gap-1.5"
      data-slot="gallery-tile"
    >
      <p className="text-muted-foreground line-clamp-2 w-full text-center text-[10px] font-medium sm:text-xs">
        {label}
      </p>
      <div aria-hidden className={TILE} />
    </div>
  );
}

export function BasicInfoStep2() {
  const info2 = useStudioStore((s) => s.info2);
  const setInfo2 = useStudioStore((s) => s.setInfo2);

  return (
    <div className="flex w-full min-w-0 flex-col">
      <h1 className="px-0.5 text-center font-semibold text-2xl leading-tight sm:text-3xl">
        Gene expression assay
      </h1>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        Link the run to a sample and add optional readouts or notes.
      </p>

      <div className="mx-auto mt-8 flex w-full min-w-0 max-w-[619px] flex-col sm:mt-10">
        <div className="min-h-[100px] w-full">
          <Field name="sampleId">
            <FieldLabel htmlFor="studio-sample-id">Sample ID</FieldLabel>
            <FieldDescription>Required. LIMS, tube barcode, or your internal id.</FieldDescription>
            <Input
              id="studio-sample-id"
              type="text"
              className="mt-2 w-full"
              value={info2.sampleId}
              onChange={(e) => setInfo2({ sampleId: e.target.value })}
              placeholder="e.g. SPL-10482-B"
            />
          </Field>
        </div>

        <div className="mt-2.5 w-full min-h-[12.5rem] sm:min-h-[200px]">
          <Field className="h-full" name="gallery">
            <FieldLabel>Readouts</FieldLabel>
            <FieldDescription>Optional placeholders for panel previews (e.g. morphology, counts).</FieldDescription>
            <div
              className="mt-2 flex min-h-0 w-full min-w-0 items-start justify-between gap-2 sm:gap-2.5"
              role="group"
              aria-label="Assay readout previews"
            >
              <GallerySlot label="Morphology" />
              <GallerySlot label="Part count" />
              <GallerySlot label="Fluor (panel)" />
              <GallerySlot label="Fluor (total)" />
            </div>
          </Field>
        </div>

        <div className="mt-2.5 min-h-0 w-full min-w-0 sm:mt-3">
          <Field name="runNotes">
            <FieldLabel htmlFor="studio-run-notes">Notes</FieldLabel>
            <FieldDescription>Extra context for collaborators; optional.</FieldDescription>
            <Textarea
              id="studio-run-notes"
              className="mt-2 min-h-[4.5rem] w-full resize-y"
              value={info2.runNotes}
              onChange={(e) => setInfo2({ runNotes: e.target.value })}
              placeholder="Optional"
              rows={4}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
