import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { liscaLocalStorage, readStorageJson, writeStorageJson } from "@lisca/utils";
import { Atom } from "effect/unstable/reactivity";

import type { AssayId } from "./studio-store";

export type ResearchAreaId =
  | "lnp-delivery"
  | "pharmacology"
  | "cancer-immunology"
  | "expression-kinetics";

export type ResearchInterestId = ResearchAreaId | "exploring";

export type AssayAreaFilter = ResearchAreaId | "selected" | "all";

export type SampleReadoutTable = {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
};

export type LiteratureReference = {
  label: string;
  citation: string;
};

export type ResearchAreaSpec = {
  id: ResearchAreaId;
  title: string;
  shortTitle: string;
  optionSummary: string;
  researchQuestion: string;
  boundaryTitle?: string;
  boundaryBody?: string;
  features: readonly { title: string; detail: string }[];
  assayIds: readonly AssayId[];
  includesLabelFree: boolean;
  sampleReadout: SampleReadoutTable;
  references: readonly LiteratureReference[];
};

export const RESEARCH_AREAS: readonly ResearchAreaSpec[] = [
  {
    id: "lnp-delivery",
    title: "RNA delivery and LNPs",
    shortTitle: "RNA delivery & LNPs",
    optionSummary:
      "Fluorescent particle attachment per ROI and downstream reporter expression kinetics.",
    researchQuestion: "Do particles bind to cells, and when does reporter expression begin?",
    boundaryTitle: "Separate physical attachment from downstream expression",
    boundaryBody:
      "Binding measures fluorescent Spot attachment on each ROI; Transfection measures a downstream reporter response. Neither measurement alone establishes uptake or endosomal escape.",
    features: [
      {
        title: "Fluorescent Spot counts and intensities (LNP binding)",
        detail:
          "Picasso net-gradient localization and 2D Gaussian fitting report per-Frame spot_count, intensity_sum, and cumulative_count (new Spots ≥ 5 px from prior localizations).",
      },
      {
        title: "Single-cell reporter kinetics (Transfection)",
        detail:
          "Local non-cell background subtraction, Otsu cell Masks, trapezoidal AUC, and two-pass kinetic fits yield Onset time (t0), Expression rate (m0·k_TL), mRNA lifetime (τ_mRNA), and shared Protein lifetime (τ_EGFP).",
      },
    ],
    assayIds: [ASSAY_TYPE.LNP_BINDING, ASSAY_TYPE.TRANSFECTION],
    includesLabelFree: false,
    sampleReadout: {
      caption:
        "Illustrative ROI readouts from LNP binding (binding.csv) and Transfection (fit.csv / auc.csv)",
      columns: [
        "Sample",
        "ROI",
        "Cumulative spots",
        "Onset time t0",
        "Expression rate",
        "τ_mRNA (h)",
      ],
      rows: [
        ["Targeted LNP", "Pos1 · Roi04", "24", "42 min", "18.4 a.u./min", "4.8"],
        ["Targeted LNP", "Pos1 · Roi11", "19", "58 min", "14.1 a.u./min", "4.3"],
        ["Untargeted LNP", "Pos2 · Roi03", "5", "112 min", "3.9 a.u./min", "3.9"],
      ],
    },
    references: [
      {
        label: "Spot localization",
        citation: "J. Schnitzbauer et al., Nat. Protoc. 12, 1198–1228 (2017).",
      },
      {
        label: "Kinetic model & segmentation",
        citation:
          "Müller et al. (2024), Eq. 3 (translation–degradation model without maturation); N. Otsu, IEEE Trans. Syst. Man Cybern. 9, 62–66 (1979).",
      },
    ],
  },
  {
    id: "pharmacology",
    title: "Pharmacology and cytotoxicity",
    shortTitle: "Pharmacology & cytotoxicity",
    optionSummary:
      "Death-reporter fluorescence Traces, single-cell death times, and Sample survival curves.",
    researchQuestion: "When do individual cells die under different experimental conditions?",
    features: [
      {
        title: "Death-reporter Traces and step viability",
        detail:
          "Subtracts per-ROI 10th-percentile local background in every Frame and calibrates noise across the Workspace to detect sustained upward membrane-compromise steps (t_death).",
      },
      {
        title: "Multi-Sample survival and death-time distributions",
        detail:
          "Writes per-Sample viability workbooks, % viable survival curves on shared axes, viable cell counts, and single-cell death-time histograms.",
      },
    ],
    assayIds: [ASSAY_TYPE.KILLING_DEATH_REPORTER],
    includesLabelFree: true,
    sampleReadout: {
      caption: "Illustrative rows from death-reporter viability (viability.csv / kill_curve.csv)",
      columns: ["Sample", "ROI", "Baseline F_corr", "Outcome", "t_death", "24 h Sample viable"],
      rows: [
        ["Vehicle Control", "Pos1 · Roi02", "18.2 a.u.", "Viable", "—", "96.0%"],
        ["0.2 µM Compound", "Pos2 · Roi07", "21.0 a.u.", "Dead", "840 min (14.0 h)", "48.5%"],
        ["2.0 µM Compound", "Pos3 · Roi05", "19.4 a.u.", "Dead", "390 min (6.5 h)", "11.2%"],
      ],
    },
    references: [
      {
        label: "Background & step viability",
        citation:
          "Per-ROI 10th-percentile background subtraction and Workspace-calibrated two-regime step detection (LiSCA reference in preparation).",
      },
    ],
  },
  {
    id: "cancer-immunology",
    title: "Cancer immunology and cell therapies",
    shortTitle: "Cancer immunology",
    optionSummary:
      "Effector T-cell engagement counts over time alongside target-cell death-reporter workflows.",
    researchQuestion: "How does T-cell engagement evolve, and when do target cells die?",
    boundaryTitle: "Separate engagement counting from target-cell death",
    boundaryBody:
      "Killing (engagement) counts effector T cells touching each tumor Mask per Frame; Killing (death reporter) measures membrane-compromise timing in a dedicated death-reporter run.",
    features: [
      {
        title: "Per-Frame T-cell engagement counts",
        detail:
          "Combines an Otsu brightfield tumor Mask with MAD-calibrated T-cell fluorescence thresholding (median + 8σ) and distance-transform watershed splitting to count tumor_cells, t_cells, and engagements.",
      },
      {
        title: "Shared killing Workspace compatibility",
        detail:
          "Run death-reporter survival curves and engagement Traces on their respective Channels without overwriting trace or summary tables.",
      },
    ],
    assayIds: [ASSAY_TYPE.KILLING_ENGAGEMENT, ASSAY_TYPE.KILLING_DEATH_REPORTER],
    includesLabelFree: true,
    sampleReadout: {
      caption:
        "Illustrative per-ROI integer counts and Sample means (engagement.csv / engagement_summary.csv)",
      columns: ["Sample", "Scope", "Frame (t)", "tumor_cells", "t_cells", "engagements"],
      rows: [
        ["CAR-T 1:4", "Pos2 · Roi08", "18 (3.0 h)", "1", "3", "2"],
        ["CAR-T 1:4", "Sample mean", "18 (3.0 h)", "1.00", "2.65", "1.92"],
        ["Untransduced T 1:4", "Sample mean", "18 (3.0 h)", "1.00", "1.10", "0.28"],
      ],
    },
    references: [
      {
        label: "Segmentation & robust thresholding",
        citation:
          "N. Otsu, IEEE Trans. Syst. Man Cybern. 9, 62–66 (1979); median absolute deviation (MAD) T-cell threshold and watershed splitting (LiSCA reference in preparation).",
      },
    ],
  },
  {
    id: "expression-kinetics",
    title: "Single-cell expression kinetics",
    shortTitle: "Expression kinetics",
    optionSummary:
      "Cell-to-cell variability in onset time, translation rate, apparent half-lives, and AUC.",
    researchQuestion: "How variable is expression between individual cells?",
    features: [
      {
        title: "Mask-isolated single-cell Traces",
        detail:
          "Local-variance Otsu segmentation tracks cell area per Frame and subtracts the surrounding non-cell median background on each Pattern spot.",
      },
      {
        title: "Two-pass kinetic fits and Sample comparisons",
        detail:
          "Pass 1 estimates degradation rates per cell; Pass 2 shares the median Protein lifetime (τ_EGFP) across cells while fitting per-cell Onset time (t0), Expression rate (m0·k_TL), and mRNA lifetime (τ_mRNA).",
      },
    ],
    assayIds: [ASSAY_TYPE.TRANSFECTION],
    includesLabelFree: false,
    sampleReadout: {
      caption:
        "Illustrative single-cell kinetic parameters from Transfection (fit.xlsx / auc.xlsx)",
      columns: [
        "Sample",
        "ROI",
        "onset_time",
        "expression_rate",
        "mrna_lifetime",
        "protein_lifetime",
        "AUC (×10⁴)",
      ],
      rows: [
        ["N1Ψ mRNA", "Pos1 · Roi04", "36.0 min", "22.5 a.u./min", "5.40 h", "6.93 h", "14.8"],
        ["N1Ψ mRNA", "Pos1 · Roi19", "64.5 min", "13.2 a.u./min", "4.15 h", "6.93 h", "8.6"],
        ["Unmodified", "Pos2 · Roi06", "78.0 min", "8.4 a.u./min", "2.75 h", "6.93 h", "4.1"],
      ],
    },
    references: [
      {
        label: "Kinetic model & local background",
        citation:
          "Müller et al. (2024), Eq. 3; N. Otsu (1979); cross-Workspace Control Bridge scaling after J. C. Waters, J. Cell Biol. 185, 1135–1148 (2009) and Halter et al. (2014).",
      },
    ],
  },
];

export const RESEARCH_INTEREST_OPTIONS: readonly {
  id: ResearchInterestId;
  title: string;
  description: string;
}[] = [
  ...RESEARCH_AREAS.map((area) => ({
    id: area.id as ResearchInterestId,
    title: area.title,
    description: area.optionSummary,
  })),
  {
    id: "exploring",
    title: "Other / I’m exploring",
    description:
      "See how LiSCA Studio connects live-cell imaging workflows and browse every supported assay.",
  },
];

const RESEARCH_AREA_BY_ID = new Map<ResearchAreaId, ResearchAreaSpec>(
  RESEARCH_AREAS.map((area) => [area.id, area]),
);

const VALID_INTEREST_IDS = new Set<ResearchInterestId>([
  "lnp-delivery",
  "pharmacology",
  "cancer-immunology",
  "expression-kinetics",
  "exploring",
]);

const VALID_AREA_FILTERS = new Set<AssayAreaFilter>([
  "lnp-delivery",
  "pharmacology",
  "cancer-immunology",
  "expression-kinetics",
  "selected",
  "all",
]);

export function getResearchAreaSpec(id: ResearchAreaId): ResearchAreaSpec {
  return RESEARCH_AREA_BY_ID.get(id) ?? RESEARCH_AREAS[0]!;
}

export function specificResearchAreasFromInterests(
  interests: readonly ResearchInterestId[],
): ResearchAreaId[] {
  const result: ResearchAreaId[] = [];
  for (const area of RESEARCH_AREAS) {
    if (interests.includes(area.id)) result.push(area.id);
  }
  return result;
}

/** Research areas to render in "How LiSCA can help your research" for the selected interests. */
export function guideAreasForInterests(
  interests: readonly ResearchInterestId[],
): readonly ResearchAreaSpec[] {
  const specific = specificResearchAreasFromInterests(interests);
  if (specific.length === 0 || interests.includes("exploring")) {
    if (specific.length === 0) return RESEARCH_AREAS;
    // Keep chosen areas first when "Other / I'm exploring" is also checked.
    const chosenSet = new Set(specific);
    return [
      ...specific.map((id) => getResearchAreaSpec(id)),
      ...RESEARCH_AREAS.filter((area) => !chosenSet.has(area.id)),
    ];
  }
  return specific.map((id) => getResearchAreaSpec(id));
}

export function defaultAreaFilterForInterests(
  interests: readonly ResearchInterestId[],
): AssayAreaFilter {
  const specific = specificResearchAreasFromInterests(interests);
  if (specific.length === 0 || interests.includes("exploring")) return "all";
  if (specific.length === 1) return specific[0]!;
  return "selected";
}

const ALL_ENABLED_ASSAY_IDS: readonly AssayId[] = [
  ASSAY_TYPE.TRANSFECTION,
  ASSAY_TYPE.KILLING_DEATH_REPORTER,
  ASSAY_TYPE.KILLING_ENGAGEMENT,
  ASSAY_TYPE.LNP_BINDING,
];

export function assaysForAreaFilter(
  filter: AssayAreaFilter,
  interests: readonly ResearchInterestId[],
): { assayIds: readonly AssayId[]; showLabelFree: boolean } {
  if (filter === "all") {
    return { assayIds: ALL_ENABLED_ASSAY_IDS, showLabelFree: true };
  }
  if (filter === "selected") {
    const specific = specificResearchAreasFromInterests(interests);
    if (specific.length === 0) {
      return { assayIds: ALL_ENABLED_ASSAY_IDS, showLabelFree: true };
    }
    const seen = new Set<AssayId>();
    const ordered: AssayId[] = [];
    let showLabelFree = false;
    for (const id of specific) {
      const spec = getResearchAreaSpec(id);
      if (spec.includesLabelFree) showLabelFree = true;
      for (const assayId of spec.assayIds) {
        if (!seen.has(assayId)) {
          seen.add(assayId);
          ordered.push(assayId);
        }
      }
    }
    return { assayIds: ordered, showLabelFree };
  }
  const spec = getResearchAreaSpec(filter);
  return {
    assayIds: spec.assayIds,
    showLabelFree: spec.includesLabelFree,
  };
}

export type StudioOnboardingState = {
  completed: boolean;
  interests: ResearchInterestId[];
  activeArea: AssayAreaFilter;
};

export const STUDIO_ONBOARDING_KEY = "lisca-studio-onboarding";

function defaultOnboardingState(): StudioOnboardingState {
  return {
    completed: false,
    interests: [],
    activeArea: "all",
  };
}

function normalizeOnboardingState(raw: unknown): StudioOnboardingState {
  if (!raw || typeof raw !== "object") return defaultOnboardingState();
  const record = raw as Partial<StudioOnboardingState>;
  const interests = Array.isArray(record.interests)
    ? record.interests.filter(
        (item): item is ResearchInterestId =>
          typeof item === "string" && VALID_INTEREST_IDS.has(item as ResearchInterestId),
      )
    : [];
  const activeArea =
    typeof record.activeArea === "string" &&
    VALID_AREA_FILTERS.has(record.activeArea as AssayAreaFilter)
      ? (record.activeArea as AssayAreaFilter)
      : defaultAreaFilterForInterests(interests);
  const resolvedArea =
    activeArea === "selected" && specificResearchAreasFromInterests(interests).length < 2
      ? defaultAreaFilterForInterests(interests)
      : activeArea;
  return {
    completed: Boolean(record.completed),
    interests,
    activeArea: resolvedArea,
  };
}

export function readStudioOnboarding(): StudioOnboardingState {
  return normalizeOnboardingState(
    readStorageJson<Partial<StudioOnboardingState>>(liscaLocalStorage(), STUDIO_ONBOARDING_KEY),
  );
}

function writeStudioOnboarding(state: StudioOnboardingState): void {
  writeStorageJson(liscaLocalStorage(), STUDIO_ONBOARDING_KEY, state);
}

export const studioOnboardingAtom = Atom.make<StudioOnboardingState>(readStudioOnboarding()).pipe(
  Atom.keepAlive,
);

type StateUpdater<T> = T | ((current: T) => T);

function patchOnboarding(
  set: (update: StateUpdater<StudioOnboardingState>) => void,
  updater: (current: StudioOnboardingState) => StudioOnboardingState,
): void {
  set((current) => {
    const next = normalizeOnboardingState(updater(current));
    writeStudioOnboarding(next);
    return next;
  });
}

export const studioOnboardingActions = {
  toggleInterest(
    set: (update: StateUpdater<StudioOnboardingState>) => void,
    interest: ResearchInterestId,
  ) {
    patchOnboarding(set, (current) => {
      const exists = current.interests.includes(interest);
      const interests = exists
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest];
      return {
        ...current,
        interests,
      };
    });
  },
  setInterests(
    set: (update: StateUpdater<StudioOnboardingState>) => void,
    interests: readonly ResearchInterestId[],
  ) {
    patchOnboarding(set, (current) => ({
      ...current,
      interests: [...interests],
    }));
  },
  completeOnboarding(
    set: (update: StateUpdater<StudioOnboardingState>) => void,
    interests?: readonly ResearchInterestId[],
    preferredArea?: AssayAreaFilter,
  ) {
    patchOnboarding(set, (current) => {
      const nextInterests = interests ? [...interests] : current.interests;
      const finalInterests =
        nextInterests.length > 0 ? nextInterests : (["exploring"] as ResearchInterestId[]);
      return {
        completed: true,
        interests: finalInterests,
        activeArea: preferredArea ?? defaultAreaFilterForInterests(finalInterests),
      };
    });
  },
  skipOnboarding(set: (update: StateUpdater<StudioOnboardingState>) => void) {
    patchOnboarding(set, (current) => ({
      completed: true,
      interests: current.interests,
      activeArea:
        current.interests.length > 0 ? defaultAreaFilterForInterests(current.interests) : "all",
    }));
  },
  setActiveArea(
    set: (update: StateUpdater<StudioOnboardingState>) => void,
    activeArea: AssayAreaFilter,
  ) {
    patchOnboarding(set, (current) => ({
      ...current,
      activeArea,
    }));
  },
};

export type StudioFeedbackDraft = {
  studyFocus: string;
  measurementsNeeded: string;
  missingWorkflow: string;
  contact: string;
  updatedAt: string | null;
};

export const STUDIO_FEEDBACK_KEY = "lisca-studio-feedback";

export function emptyStudioFeedbackDraft(): StudioFeedbackDraft {
  return {
    studyFocus: "",
    measurementsNeeded: "",
    missingWorkflow: "",
    contact: "",
    updatedAt: null,
  };
}

export function readStudioFeedbackDraft(): StudioFeedbackDraft {
  const parsed = readStorageJson<Partial<StudioFeedbackDraft>>(
    liscaLocalStorage(),
    STUDIO_FEEDBACK_KEY,
  );
  if (!parsed || typeof parsed !== "object") return emptyStudioFeedbackDraft();
  return {
    studyFocus: typeof parsed.studyFocus === "string" ? parsed.studyFocus : "",
    measurementsNeeded:
      typeof parsed.measurementsNeeded === "string" ? parsed.measurementsNeeded : "",
    missingWorkflow: typeof parsed.missingWorkflow === "string" ? parsed.missingWorkflow : "",
    contact: typeof parsed.contact === "string" ? parsed.contact : "",
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
  };
}

export function saveStudioFeedbackDraft(
  draft: Omit<StudioFeedbackDraft, "updatedAt">,
): StudioFeedbackDraft {
  const next: StudioFeedbackDraft = {
    studyFocus: draft.studyFocus,
    measurementsNeeded: draft.measurementsNeeded,
    missingWorkflow: draft.missingWorkflow,
    contact: draft.contact,
    updatedAt: new Date().toISOString(),
  };
  writeStorageJson(liscaLocalStorage(), STUDIO_FEEDBACK_KEY, next);
  return next;
}

export function formatStudioFeedbackMarkdown(
  draft: Pick<
    StudioFeedbackDraft,
    "studyFocus" | "measurementsNeeded" | "missingWorkflow" | "contact"
  >,
): string {
  const sections = [
    "## Research feedback for LiSCA Studio",
    "",
    "### What we study",
    draft.studyFocus.trim() || "_Not specified_",
    "",
    "### Measurements needed",
    draft.measurementsNeeded.trim() || "_Not specified_",
    "",
    "### What is missing or slowing down the workflow",
    draft.missingWorkflow.trim() || "_Not specified_",
  ];
  if (draft.contact.trim()) {
    sections.push("", "### Lab / contact", draft.contact.trim());
  }
  return sections.join("\n");
}

export function buildStudioFeedbackIssueUrl(
  draft: Pick<
    StudioFeedbackDraft,
    "studyFocus" | "measurementsNeeded" | "missingWorkflow" | "contact"
  >,
): string {
  const focusHeadline = draft.studyFocus.trim().split("\n")[0]?.slice(0, 60).trim();
  const title = focusHeadline
    ? `Research workflow feedback: ${focusHeadline}`
    : "Research workflow feedback";
  const body = formatStudioFeedbackMarkdown(draft);
  const params = new URLSearchParams({
    title,
    body,
  });
  return `https://github.com/keejkrej/lisca/issues/new?${params.toString()}`;
}
