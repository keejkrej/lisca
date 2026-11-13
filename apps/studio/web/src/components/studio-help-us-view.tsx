import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Input,
  Textarea,
} from "@lisca/ui/primitives";
import { Show } from "solid-js";

export function StudioHelpUsView(props: {
  studyFocus: string;
  measurementsNeeded: string;
  missingWorkflow: string;
  contact: string;
  savedAt: string | null;
  copied: boolean;
  onChangeStudyFocus: (value: string) => void;
  onChangeMeasurementsNeeded: (value: string) => void;
  onChangeMissingWorkflow: (value: string) => void;
  onChangeContact: (value: string) => void;
  onSaveDraft: () => void;
  onCopySummary: () => void;
  onOpenGitHubIssue: () => void;
  onBackToAssays: () => void;
}) {
  return (
    <div class="flex w-full max-w-[44rem] min-w-0 flex-col gap-8">
      <div class="flex flex-col items-start gap-2.5">
        <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
          Optional feedback
        </span>
        <h1 class="text-3xl font-semibold leading-9 tracking-[-0.025em] text-foreground">
          Help us improve LiSCA
        </h1>
        <p class="text-sm leading-5 text-muted-foreground">
          Tell us what you study, what single-cell measurements your experiments require, and what
          is missing today. You can save these optional notes locally or share them when you are
          ready.
        </p>
      </div>

      <Alert>
        <AlertTitle>Local-first and optional</AlertTitle>
        <AlertDescription>
          LiSCA Studio does not send background telemetry. Save your notes locally, copy a formatted
          summary, or open a pre-filled GitHub issue when you are ready to share.
        </AlertDescription>
      </Alert>

      <FieldGroup class="flex flex-col gap-5">
        <Field>
          <FieldLabel for="lisca-feedback-study">What do you study?</FieldLabel>
          <FieldDescription>
            Your research area, biological model, micropattern geometry, or microscope acquisition
            format.
          </FieldDescription>
          <Textarea
            id="lisca-feedback-study"
            placeholder="For example: primary hepatocyte mRNA delivery on 30 µm fibronectin squares imaged every 10 min on Nikon ND2…"
            rows={3}
            value={props.studyFocus}
            onInput={(event) => props.onChangeStudyFocus(event.currentTarget.value)}
          />
        </Field>

        <Field>
          <FieldLabel for="lisca-feedback-measurements">What do you need to measure?</FieldLabel>
          <FieldDescription>
            Per-cell readouts, multi-channel relationships, kinetic parameters, or summary tables
            you report.
          </FieldDescription>
          <Textarea
            id="lisca-feedback-measurements"
            placeholder="For example: dual-reporter ratio per ROI, endosomal colocalization alongside onset time, or custom viability thresholds…"
            rows={3}
            value={props.measurementsNeeded}
            onInput={(event) => props.onChangeMeasurementsNeeded(event.currentTarget.value)}
          />
        </Field>

        <Field>
          <FieldLabel for="lisca-feedback-missing">What is missing in LiSCA?</FieldLabel>
          <FieldDescription>
            Steps that require external scripts today, file formats, alignment edge cases, or plot
            exports.
          </FieldDescription>
          <Textarea
            id="lisca-feedback-missing"
            placeholder="For example: multi-Z projection during ROI crop, custom kinetic models with fluorophore maturation, or plate-map import…"
            rows={3}
            value={props.missingWorkflow}
            onInput={(event) => props.onChangeMissingWorkflow(event.currentTarget.value)}
          />
        </Field>

        <Field>
          <FieldLabel for="lisca-feedback-contact">Lab or contact (optional)</FieldLabel>
          <FieldDescription>
            Included only if you copy the summary or open a GitHub issue so we can follow up.
          </FieldDescription>
          <Input
            id="lisca-feedback-contact"
            placeholder="Lab name, GitHub handle, or email"
            type="text"
            value={props.contact}
            onInput={(event) => props.onChangeContact(event.currentTarget.value)}
          />
        </Field>
      </FieldGroup>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <div class="flex items-center gap-2">
          <Button size="default" type="button" variant="outline" onClick={props.onBackToAssays}>
            Back to Assay
          </Button>
          <Show when={props.savedAt}>
            <span class="text-xs text-muted-foreground">Draft saved locally</span>
          </Show>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button size="default" type="button" variant="outline" onClick={props.onSaveDraft}>
            Save
          </Button>
          <Button size="default" type="button" variant="outline" onClick={props.onCopySummary}>
            {props.copied ? "Copied" : "Copy summary"}
          </Button>
          <Button size="default" type="button" onClick={props.onOpenGitHubIssue}>
            Open GitHub issue
          </Button>
        </div>
      </div>
    </div>
  );
}
