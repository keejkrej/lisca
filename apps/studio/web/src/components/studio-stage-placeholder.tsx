import { ViewportCard } from "@lisca/ui/shell";

import { StudioEmptyState } from "./studio-empty-state";

export type StudioStagePlaceholderAction = "metadata" | "align" | "annotate";

export type StudioStagePlaceholder = {
  title: string;
  description: string;
  actionLabel?: string;
  action?: StudioStagePlaceholderAction;
};

export function studioStagePlaceholderRoute(
  action: StudioStagePlaceholderAction,
): "/metadata" | "/align" | "/annotate" {
  if (action === "metadata") return "/metadata";
  if (action === "align") return "/align";
  return "/annotate";
}

/** Missing files and bad paths. Other failures stay on the canvas toast. */
export function isWorkspaceDataMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("source not found") ||
    normalized.includes("no such file") ||
    normalized.includes("cannot find the file") ||
    normalized.includes("cannot find the path") ||
    normalized.includes("not a directory") ||
    normalized.includes("file error") ||
    normalized.includes("os error 2") ||
    normalized.includes("os error 3")
  );
}

function goToMetadata(title: string, description: string): StudioStagePlaceholder {
  return {
    title,
    description,
    actionLabel: "Go to Metadata",
    action: "metadata",
  };
}

const NO_ASSAY_ALIGN = goToMetadata(
  "No assay loaded",
  "Open a workspace on Metadata. Align reads the source images from that assay.",
);

const NO_ASSAY_ANNOTATE = goToMetadata(
  "No assay loaded",
  "Open a workspace on Metadata. Annotation needs the cropped ROIs from that assay.",
);

const NO_ASSAY_ANALYSIS = goToMetadata(
  "No assay loaded",
  "Open a workspace on Metadata. Analysis shows the plots from that assay.",
);

const DATA_NOT_FOUND = goToMetadata(
  "Data not found",
  "Check that the data is still there, or go to Metadata and open the correct workspace.",
);

const NO_ALIGN_POSITIONS = goToMetadata(
  "Data not found",
  "None of the positions from Metadata are in this source. Check the position ranges, or open the correct workspace.",
);

const NO_CROPPED_ROIS: StudioStagePlaceholder = {
  title: "No cropped ROIs",
  description: "Align the grid and crop ROI images first. Annotation needs those ROI stacks.",
  actionLabel: "Go to Align",
  action: "align",
};

export function alignStagePlaceholder(input: {
  workspacePath: string | null;
  hasSource: boolean;
  scanLoading: boolean;
  hasScan: boolean;
  alignPositionCount: number;
  error: string | null;
}): StudioStagePlaceholder | null {
  if (!input.workspacePath?.trim()) return NO_ASSAY_ALIGN;
  if (input.scanLoading) return null;
  if (!input.hasSource || (input.error != null && isWorkspaceDataMissingError(input.error))) {
    return DATA_NOT_FOUND;
  }
  if (input.hasScan && input.alignPositionCount === 0) return NO_ALIGN_POSITIONS;
  return null;
}

export function annotateStagePlaceholder(input: {
  workspaceMissing: boolean;
  scanLoading: boolean;
  /** `null` when the ROI scan has not produced a result. */
  positionCount: number | null;
  scanError: string | null;
}): StudioStagePlaceholder | null {
  if (input.workspaceMissing) return NO_ASSAY_ANNOTATE;
  if (input.scanLoading) return null;
  if (input.positionCount === 0) return NO_CROPPED_ROIS;
  if (
    input.positionCount == null &&
    input.scanError != null &&
    isWorkspaceDataMissingError(input.scanError)
  ) {
    return DATA_NOT_FOUND;
  }
  return null;
}

export function analysisStagePlaceholder(input: {
  workspacePath: string | null | undefined;
  hasAnyPlots: boolean;
  sectionPlotCount: number;
}): StudioStagePlaceholder | null {
  if (input.sectionPlotCount > 0) return null;
  if (!input.workspacePath?.trim()) return NO_ASSAY_ANALYSIS;
  if (input.hasAnyPlots) {
    return {
      title: "Nothing in this view",
      description: "Switch views in the dock, or run analysis again.",
    };
  }
  return {
    title: "No plots yet",
    description: "On Annotate, press Analyze. Finished plots appear here as images.",
    actionLabel: "Go to Annotate",
    action: "annotate",
  };
}

/** Centered sheet placeholder shared by Align, Annotate, and Analysis. */
export function StudioStagePlaceholderView(props: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <ViewportCard contentClass="relative max-w-[480px]">
      <StudioEmptyState
        actionLabel={props.actionLabel}
        description={props.description}
        title={props.title}
        onAction={props.onAction}
      />
    </ViewportCard>
  );
}
