import type { Html } from "@effect/ui/html";
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

export type StudioHelpUsViewOptions<M> = {
  readonly studyFocus: string;
  readonly measurementsNeeded: string;
  readonly missingWorkflow: string;
  readonly contact: string;
  readonly savedAt: string | null;
  readonly copied: boolean;
  readonly onChangeStudyFocus: (value: string) => M;
  readonly onChangeMeasurementsNeeded: (value: string) => M;
  readonly onChangeMissingWorkflow: (value: string) => M;
  readonly onChangeContact: (value: string) => M;
  readonly onSaveDraft: M;
  readonly onCopySummary: M;
  readonly onOpenGitHubIssue: M;
  readonly onBackToAssays: M;
};

export function StudioHelpUsView<M>(h: Html.H<M>, options: StudioHelpUsViewOptions<M>) {
  return h.div.class("flex w-full max-w-[44rem] min-w-0 flex-col gap-8").children(
    h.div
      .class("flex flex-col items-start gap-2.5")
      .children(
        h.span
          .class(
            "text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground",
          )
          .children("Optional feedback"),
        h.h1
          .class("text-3xl font-semibold leading-9 tracking-[-0.025em] text-foreground")
          .children("Help us improve LiSCA"),
        h.p
          .class("text-sm leading-5 text-muted-foreground")
          .children(
            "Tell us what you study, what single-cell measurements your experiments require, and what is missing today. You can save these optional notes locally or share them when you are ready.",
          ),
      ),
    Alert(h).children(
      AlertTitle(h).children("Local-first and optional"),
      AlertDescription(h).children(
        "LiSCA Studio does not send background telemetry. Save your notes locally, copy a formatted summary, or open a pre-filled GitHub issue when you are ready to share.",
      ),
    ),
    FieldGroup(h, { class: "flex flex-col gap-5" }).children(
      Field(h).children(
        FieldLabel(h, { for: "lisca-feedback-study" }).children("What do you study?"),
        FieldDescription(h).children(
          "Your research area, biological model, micropattern geometry, or microscope acquisition format.",
        ),
        Textarea(h, {
          id: "lisca-feedback-study",
          placeholder:
            "For example: primary hepatocyte mRNA delivery on 30 µm fibronectin squares imaged every 10 min on Nikon ND2…",
          rows: 3,
          value: options.studyFocus,
          onInput: options.onChangeStudyFocus,
        }),
      ),
      Field(h).children(
        FieldLabel(h, { for: "lisca-feedback-measurements" }).children(
          "What do you need to measure?",
        ),
        FieldDescription(h).children(
          "Per-cell readouts, multi-channel relationships, kinetic parameters, or summary tables you report.",
        ),
        Textarea(h, {
          id: "lisca-feedback-measurements",
          placeholder:
            "For example: dual-reporter ratio per ROI, endosomal colocalization alongside onset time, or custom viability thresholds…",
          rows: 3,
          value: options.measurementsNeeded,
          onInput: options.onChangeMeasurementsNeeded,
        }),
      ),
      Field(h).children(
        FieldLabel(h, { for: "lisca-feedback-missing" }).children("What is missing in LiSCA?"),
        FieldDescription(h).children(
          "Steps that require external scripts today, file formats, alignment edge cases, or plot exports.",
        ),
        Textarea(h, {
          id: "lisca-feedback-missing",
          placeholder:
            "For example: multi-Z projection during ROI crop, custom kinetic models with fluorophore maturation, or plate-map import…",
          rows: 3,
          value: options.missingWorkflow,
          onInput: options.onChangeMissingWorkflow,
        }),
      ),
      Field(h).children(
        FieldLabel(h, { for: "lisca-feedback-contact" }).children("Lab or contact (optional)"),
        FieldDescription(h).children(
          "Included only if you copy the summary or open a GitHub issue so we can follow up.",
        ),
        Input(h, {
          id: "lisca-feedback-contact",
          placeholder: "Lab name, GitHub handle, or email",
          type: "text",
          value: options.contact,
          onInput: options.onChangeContact,
        }),
      ),
    ),
    h.div
      .class("flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5")
      .children(
        h.div.class("flex items-center gap-2").children(
          Button(h, {
            size: "default",
            type: "button",
            variant: "outline",
            onPress: options.onBackToAssays,
          }).children("Back to Assay"),
          options.savedAt
            ? h.span.class("text-xs text-muted-foreground").children("Draft saved locally")
            : undefined,
        ),
        h.div.class("flex flex-wrap items-center gap-2").children(
          Button(h, {
            size: "default",
            type: "button",
            variant: "outline",
            onPress: options.onSaveDraft,
          }).children("Save"),
          Button(h, {
            size: "default",
            type: "button",
            variant: "outline",
            onPress: options.onCopySummary,
          }).children(options.copied ? "Copied" : "Copy summary"),
          Button(h, {
            size: "default",
            type: "button",
            onPress: options.onOpenGitHubIssue,
          }).children("Open GitHub issue"),
        ),
      ),
  );
}
