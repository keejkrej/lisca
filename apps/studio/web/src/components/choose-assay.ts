import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button, ComingSoonTooltip } from "@lisca/ui/primitives";
import { Schema } from "effect";

import { studioAtomsSubscription, studioRegistry } from "../state/studio-registry";
import { studioStoreActions, studioWizardAtom, type AssayId } from "../state/studio-store";

type AssayFieldId = "lnp-delivery" | "cell-killing";

type AssayField = {
  readonly id: AssayFieldId;
  readonly label: string;
  readonly assayIds: readonly AssayId[];
  readonly includesLabelFree: boolean;
};

const ASSAY_FIELDS: readonly AssayField[] = [
  {
    id: "lnp-delivery",
    label: "LNP delivery",
    assayIds: ["transfection", "lnp-binding"],
    includesLabelFree: false,
  },
  {
    id: "cell-killing",
    label: "Cell killing",
    assayIds: ["killing-death-reporter", "killing-engagement"],
    includesLabelFree: true,
  },
];

const ASSAY_CHOICE_DETAIL: Record<
  AssayId,
  { readonly title: string; readonly description: string; readonly readout: string }
> = {
  transfection: {
    title: "LNP transfection",
    description: "Gene expression timeseries",
    readout: "Fluorescence",
  },
  "killing-death-reporter": {
    title: "Killing (death reporter)",
    description: "Cytotoxicity timeseries",
    readout: "Fluorescence",
  },
  "killing-engagement": {
    title: "Killing (engagement)",
    description: "Engager counts",
    readout: "Fluorescence",
  },
  "lnp-binding": {
    title: "LNP binding",
    description: "Nanoparticle binding over time",
    readout: "Fluorescence",
  },
};

const AssayFieldIdSchema = Schema.Literals(["lnp-delivery", "cell-killing"]);
const AssayIdSchema = Schema.Literals([
  "transfection",
  "killing-death-reporter",
  "killing-engagement",
  "lnp-binding",
]);

const ChooseAssayMsg = UiSchema.TaggedEnum({
  SelectField: { fieldId: AssayFieldIdSchema },
  SelectAssay: { assayId: AssayIdSchema },
  SetComingSoonOpen: { open: Schema.Boolean },
  OpenGuideClicked: {},
  OpenFeedbackClicked: {},
  WizardChanged: {},
});

const ChooseAssayEvents = UiSchema.TaggedEnum({
  OpenGuide: {},
  OpenFeedback: {},
});

function initialFieldId(): AssayFieldId {
  const assayId = studioRegistry.get(studioWizardAtom).assayId ?? "transfection";
  return (ASSAY_FIELDS.find((area) => area.assayIds.includes(assayId)) ?? ASSAY_FIELDS[0]!).id;
}

const ChooseAssayComponent = Html.component({
  name: "ChooseAssay",
  props: Schema.Struct({
    hasGuide: Schema.Boolean,
    hasFeedback: Schema.Boolean,
  }),
  model: Schema.Struct({
    fieldId: AssayFieldIdSchema,
    comingSoonOpen: Schema.Boolean,
    revision: Schema.Number,
  }),
  message: ChooseAssayMsg,
  events: ChooseAssayEvents,
}).make({
  init: () => ({
    fieldId: initialFieldId(),
    comingSoonOpen: false,
    revision: 0,
  }),
  update: {
    SelectField: ($, { fieldId }) => $.evolve({ fieldId, comingSoonOpen: false }),
    SelectAssay: ($, { assayId }) => {
      studioStoreActions.setAssayId(assayId);
      return $.evolve({ revision: (n) => n + 1 });
    },
    SetComingSoonOpen: ($, { open }) => $.evolve({ comingSoonOpen: open }),
    OpenGuideClicked: ($) => $.emit(ChooseAssayEvents.OpenGuide()),
    OpenFeedbackClicked: ($) => $.emit(ChooseAssayEvents.OpenFeedback()),
    WizardChanged: ($) => $.evolve({ revision: (n) => n + 1 }),
  },
  subscriptions: () => [
    studioAtomsSubscription(
      "choose-assay-wizard",
      [studioWizardAtom],
      ChooseAssayMsg.WizardChanged(),
    ),
  ],
  view: (h, model) => {
    const wizard = studioRegistry.get(studioWizardAtom);
    const field = ASSAY_FIELDS.find((area) => area.id === model.fieldId) ?? ASSAY_FIELDS[0]!;

    return h.div.class("flex w-full max-w-[640px] min-w-0 flex-col gap-8").children(
      h.div.class("flex w-full flex-col gap-3").children(
        h.span
          .class(
            "text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground",
          )
          .children("Research field"),
        h.div
          .attr("aria-label", "Research field")
          .attr("role", "group")
          .class("flex flex-wrap gap-1.5")
          .children(
            ...ASSAY_FIELDS.map((area) => {
              const pressed = field.id === area.id;
              return Button(h, {
                size: "sm",
                type: "button",
                variant: pressed ? "default" : "outline",
                onPress: ChooseAssayMsg.SelectField({ fieldId: area.id }),
              })
                .key(area.id)
                .attr("aria-pressed", pressed ? "true" : "false")
                .children(area.label);
            }),
          ),
      ),
      h.div.class("flex w-full flex-col gap-2.5").children(
        h.span
          .class(
            "text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground",
          )
          .children("Assay workflow"),
        h.div
          .attr("aria-label", "Assay type")
          .attr("role", "group")
          .class("flex w-full flex-col gap-2.5")
          .children(
            ...field.assayIds.map((id) => {
              const selected = wizard.assayId === id;
              const detail = ASSAY_CHOICE_DETAIL[id];
              return Button(h, {
                class:
                  "h-auto w-full items-center justify-start gap-3 rounded-none px-5 py-[18px] text-left",
                type: "button",
                variant: selected ? "default" : "secondary",
                onPress: ChooseAssayMsg.SelectAssay({ assayId: id }),
              })
                .key(id)
                .attr("aria-pressed", selected ? "true" : "false")
                .children(
                  h.span
                    .class("flex min-w-0 flex-1 flex-col items-start gap-1")
                    .children(
                      h.span.class("text-base font-medium leading-5").children(detail.title),
                      h.span
                        .class(
                          selected
                            ? "text-sm font-normal leading-5 text-primary-foreground/75"
                            : "text-sm font-normal leading-5 text-muted-foreground",
                        )
                        .children(detail.description),
                    ),
                  h.span
                    .class(
                      selected
                        ? "shrink-0 text-[11px] font-medium uppercase leading-[14px] tracking-[0.14em] text-primary-foreground"
                        : "shrink-0 text-[11px] font-medium uppercase leading-[14px] tracking-[0.14em] text-muted-foreground",
                    )
                    .children(detail.readout),
                );
            }),
            field.includesLabelFree
              ? ComingSoonTooltip(h, {
                  key: "label-free-coming-soon",
                  class: "flex w-full",
                  open: model.comingSoonOpen,
                  onOpenChange: (open) => ChooseAssayMsg.SetComingSoonOpen({ open }),
                  trigger: (attach) =>
                    Button(h, {
                      element: attach(h.button),
                      class:
                        "h-auto w-full items-center justify-start gap-3 rounded-none px-5 py-[18px] text-left",
                      disabled: true,
                      focusableWhenDisabled: true,
                      type: "button",
                      variant: "secondary",
                    }).children(
                      h.span
                        .class("flex min-w-0 flex-1 flex-col items-start gap-1")
                        .children(
                          h.span
                            .class("text-base font-medium leading-5")
                            .children("Killing (label-free)"),
                          h.span
                            .class("text-sm font-normal leading-5 text-muted-foreground")
                            .children("Cytotoxicity timeseries"),
                        ),
                      h.span
                        .class(
                          "shrink-0 text-[11px] font-medium uppercase leading-[14px] tracking-[0.14em] text-muted-foreground",
                        )
                        .children("Brightfield"),
                    ),
                })
              : undefined,
          ),
      ),
      h.props.hasGuide || h.props.hasFeedback
        ? h.div
            .class("flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4")
            .children(
              h.span
                .class("text-xs text-muted-foreground")
                .children("Need another single-cell readout or experimental workflow?"),
              h.div.class("flex flex-wrap items-center gap-2").children(
                h.props.hasGuide
                  ? Button(h, {
                      size: "xs",
                      type: "button",
                      variant: "ghost",
                      onPress: ChooseAssayMsg.OpenGuideClicked(),
                    }).children("Research guide")
                  : undefined,
                h.props.hasFeedback
                  ? Button(h, {
                      size: "xs",
                      type: "button",
                      variant: "ghost",
                      onPress: ChooseAssayMsg.OpenFeedbackClicked(),
                    }).children("Help us improve LiSCA")
                  : undefined,
              ),
            )
        : undefined,
    );
  },
});

export type ChooseAssayOptions<M> = {
  readonly key?: string | undefined;
  readonly onOpenFeedback?: M | undefined;
  readonly onOpenGuide?: M | undefined;
};

export function ChooseAssay<M>(h: Html.H<M>, options: ChooseAssayOptions<M> = {}) {
  return ChooseAssayComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      hasGuide: options.onOpenGuide !== undefined,
      hasFeedback: options.onOpenFeedback !== undefined,
    },
    onEmit: {
      OpenGuide: () => options.onOpenGuide,
      OpenFeedback: () => options.onOpenFeedback,
    },
  });
}
