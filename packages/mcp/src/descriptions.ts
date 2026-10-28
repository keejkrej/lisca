import type { ProductId } from "./config.ts";
import { PRODUCT_TITLES } from "./config.ts";

/** Curated, domain-language descriptions for the HttpApi operations. */
export const OPERATION_DESCRIPTIONS: Record<string, string> = {
  "fs.listDirectory":
    "List a directory on the machine running the product server: files and folders with sizes. Use it to explore disk paths (home, drives, acquisitions) exactly like the app's file pickers do.",
  "fs.userHomeDirectory":
    "Return the current user's home directory path on the machine running the product server.",
  "fs.windowsDrives": "List available drive roots on a Windows host (empty elsewhere).",
  "fs.readTextFile":
    "Read a UTF-8 text file from the host filesystem: assay.json, bbox CSVs, ROI index JSON, logs, and the like.",
  "fs.createDirectory":
    "Create a directory on the host filesystem (mkdir -p), for example a new workspace folder.",

  "align.scanSource":
    "Scan an Image source — ND2 file, CZI file, or templated folder — and report its Positions, Channels, Frames (times), and Z planes. First call of a session: this is how you discover what an acquisition contains before aligning it.",
  "align.loadFrame":
    "Load one frame of an Image: a 2D grayscale image picked by Position, Channel, Frame (time), and Z. Returns pixel metadata plus the frame rendered as a PNG image you can view. Pass a contrast window to control the display mapping.",
  "align.saveBbox":
    "Save the alignment for one Position: the fitted pattern grid state (shape, translation, rotation, spacing, pattern box size), excluded patterns, and drift keyframes. Persists bbox/Pos{n}.csv (ROI boxes) and align/Pos{n}.json in the workspace. ROI crop and annotation read these.",
  "align.loadAlignState":
    "Load the saved alignment state for one Position of a workspace (grid, exclusions, drift), or null when the Position has not been aligned yet.",
  "align.outputPaths":
    "Resolve the workspace-relative output paths (bbox, align, roi) that a Position's alignment is stored under.",
  "align.listSavedBboxPositions":
    "List the Positions of a workspace that already have saved ROI boxes (bbox/Pos{n}.csv).",
  "align.roiPosExists":
    "Check whether a Position already has cropped ROI image stacks (roi/Pos{n}).",
  "align.cropRoi":
    "Start the ROI crop task: write per-ROI TIFF image stacks (roi/Pos{n}/Roi*.tif plus index.json) from the saved ROI boxes, preserving Position and ROI identity. Long-running — follow it with crop_wait or align_crop_roi_progress. Served by Studio only; the Aligner shell has no crop routes.",
  "align.cancelCropRoi": "Request cancellation of a running ROI crop task.",
  "align.cropRoiProgress":
    "Poll one ROI crop task by requestId: status (queued/running/completed/cancelled/error), positions and ROIs done, message.",
  "align.getLatestCropProgress":
    "Get the latest crop progress for a workspace (or null when none ran).",
  "align.smartExclude":
    "Smart exclude: run the exclusion model over a frame's pattern grid and return the pattern coordinates (i, j) it suggests excluding from the grid before ROI crop.",

  "annotate.scanRoiWorkspace":
    "Scan a workspace's roi/ image stacks and report, per Position, the Channels, Frames (times), Z planes, and ROI count available for annotation. First call of an annotation session.",
  "annotate.loadLabels":
    "Load the annotation label set (ids, names, colors) of a workspace (annotations/labels.json), or the default labels when none are saved.",
  "annotate.saveLabels": "Save the annotation label set of a workspace.",
  "annotate.loadRoiFrame":
    "Load one ROI frame image for annotation: pixels by workspace, Position, ROI, Channel, Frame, Z. Returns the frame rendered as a PNG you can view.",
  "annotate.loadRoiFrameAnnotation":
    "Load the saved annotation for one ROI frame — its classification label and mask — or null. The mask PNG is returned as a viewable image.",
  "annotate.saveRoiFrameAnnotation":
    "Save an annotation for one ROI frame: a classification label id and/or a mask PNG (base64).",
  "annotate.smartSegment":
    "Smart segment: click-prompted segmentation on an ROI frame. Given positive and negative point prompts (x, y pixel coordinates), returns label ids for the cell you clicked.",

  "profile.listProfiles": "List the local profiles known to the Studio server.",
  "profile.createProfile":
    "Create a local profile by display name; returns the access token for guarded routes.",
  "profile.signInProfile":
    "Sign in as a local profile; returns the access token for guarded routes.",
  "profile.signOutProfile":
    "Sign out the current profile session. Guarded: set LISCA_MCP_PROFILE_TOKEN to a valid access token.",
  "memory.getRecentMemory":
    "Read the Studio wizard's recent-workspace memory (labs recently opened in Studio). Guarded: set LISCA_MCP_PROFILE_TOKEN.",
  "memory.touchMemory":
    "Record a workspace in the Studio wizard's recent-workspace memory. Guarded: set LISCA_MCP_PROFILE_TOKEN.",

  "tasks.listTasks": "List background tasks (ROI crops, analysis runs) with status and progress.",
  "tasks.getTask": "Get one task with its steps: status, dependencies, attempts, progress.",
  "tasks.getStep": "Get one step of a task in detail.",
  "tasks.cancelTask": "Cancel a task: requests cancellation of its running steps.",
  "tasks.dismissTask":
    "Remove a finished task (completed, failed, or cancelled) from the Task Center.",
  "tasks.cancelStep": "Cancel one step of a task.",
  "tasks.retryStep": "Retry a failed or cancelled step of a task.",

  "studio.saveAssayJson":
    "Write a workspace's assay.json — the typed assay description: assay kind, Image source, Positions, Channels, timing, Samples, and analysis config. Start of the Studio analyze flow.",
  "studio.startAnalysis":
    "Start an Analysis run for a workspace. The assay.json root type selects the pipeline (transfection stages, killing-death-reporter, killing-engagement, or lnp-binding). Long-running — follow it with analysis_wait or studio_get_analysis_progress.",
  "studio.getAnalysisProgress":
    "Poll one Analysis run by requestId. Stages: queued → preparing → segment → traces → auc → fit → completed (or error).",
  "studio.getLatestAnalysisProgress":
    "Get the latest Analysis run for a workspace (or null when none started).",
  "studio.getAnalysisResults":
    "Get the results of the latest completed Analysis run for a workspace: per-file CSV contents (transfection ratio, AUC, fit parameters, killing traces, engagement, binding spots).",
  "studio.labelFreeHealth":
    "Check whether label-free killing is configured (OpenRouter embedding key set).",
  "studio.saveLabelFreeKey": "Save the OpenRouter API key used by label-free killing.",
  "studio.listLabelFreeReferences":
    "List the label-free reference sets built for a workspace (built from its annotations).",
  "studio.buildLabelFreeReferences":
    "Build a label-free reference set from a workspace's annotated ROI frames, per label.",
  "studio.classifyLabelFree":
    "Classify ROI frames label-free against a reference set: returns label ids and confidences.",
};

function fallbackDescription(operationId: string, method: string, path: string): string {
  return `Call ${method} ${path} on the product server (operationId ${operationId}).`;
}

export function operationDescription(
  operationId: string,
  method: string,
  path: string,
  products: ProductId[],
): string {
  const curated = OPERATION_DESCRIPTIONS[operationId];
  const body = curated ?? fallbackDescription(operationId, method, path);
  const names = products.map((product) => PRODUCT_TITLES[product]).join(" or ");
  return `${body} Served by ${names}.`;
}
