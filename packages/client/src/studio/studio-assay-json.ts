import { AssayJsonFileSchema, decodeJsonResult, formatSchemaError } from "@lisca/contracts";
import { ASSAY_TYPE } from "@lisca/contracts/assay";
import type {
  AssayAnalysisConfig,
  AssayData,
  StudioAssayJson,
  StudioAssaySampleRow,
  StudioAssaySampleRowFields,
  StudioAssayType,
  StudioDataSourceKind,
  StudioIntervalUnit,
} from "@lisca/contracts/assay";
import {
  ASSAY_DEFAULT_INTERVAL_MINUTES,
  assayUsesMaxOnsetMinutes,
  assayUsesSkipSegment,
  DEFAULT_FOLDER_SOURCE_TEMPLATE,
  TRANSFECTION_DEFAULT_MAX_ONSET_MINUTES,
} from "@lisca/contracts/assay";
import type { AssaySampleRow } from "@lisca/contracts";
import * as Either from "effect/Either";

import { analysisChannelsFromSamples } from "./sample-positions";

export const ASSAY_CHOICE_LABEL: Record<StudioAssayType, string> = {
  [ASSAY_TYPE.TRANSFECTION]: "Transfection",
  [ASSAY_TYPE.KILLING]: "Killing",
  [ASSAY_TYPE.LNP_BINDING]: "LNP binding",
};

export {
  ASSAY_DEFAULT_INTERVAL_MINUTES,
  assayUsesMaxOnsetMinutes,
  assayUsesSkipSegment,
  TRANSFECTION_DEFAULT_MAX_ONSET_MINUTES,
};

export function defaultIntervalMinutesForAssay(assayId: StudioAssayType | null): number | null {
  if (!assayId) return null;
  return ASSAY_DEFAULT_INTERVAL_MINUTES[assayId] ?? null;
}

export function defaultMaxOnsetMinutesForAssay(assayId: StudioAssayType | null): number | null {
  if (!assayUsesMaxOnsetMinutes(assayId)) return null;
  return TRANSFECTION_DEFAULT_MAX_ONSET_MINUTES;
}

export function analysisConfigForAssay(
  assayId: StudioAssayType | null,
  analysis: AssayAnalysisConfig | null | undefined,
): AssayAnalysisConfig | undefined {
  const transfectionBits =
    assayUsesMaxOnsetMinutes(assayId) || assayUsesSkipSegment(assayId)
      ? {
          maxOnsetMinutes: analysis?.maxOnsetMinutes ?? TRANSFECTION_DEFAULT_MAX_ONSET_MINUTES,
          skipSegment: analysis?.skipSegment ?? false,
        }
      : {};

  const channels = analysis?.channels;
  const sampleChannels = analysis?.sampleChannels;

  if (
    Object.keys(transfectionBits).length === 0 &&
    channels == null &&
    (sampleChannels == null || sampleChannels.length === 0)
  ) {
    return undefined;
  }

  return {
    ...transfectionBits,
    ...(channels != null ? { channels } : {}),
    ...(sampleChannels != null && sampleChannels.length > 0 ? { sampleChannels } : {}),
  };
}

export function inferDataSourceKind(path: string): StudioDataSourceKind {
  const lower = path.trim().toLowerCase();
  if (lower.endsWith(".nd2")) return "nd2";
  if (lower.endsWith(".czi")) return "czi";
  if (path.trim()) return "folder";
  return null;
}

export function buildAssayData(input: {
  kind: StudioDataSourceKind;
  path: string;
  folderTemplate?: { subfolder: string; filename: string };
}): AssayData {
  const path = input.path;
  if (input.kind === "folder") {
    return {
      type: "folder",
      path,
      template: {
        subfolder:
          input.folderTemplate?.subfolder ?? DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
        filename:
          input.folderTemplate?.filename ?? DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
      },
    };
  }
  if (input.kind === "czi") {
    return { type: "czi", path };
  }
  // Default nd2 when kind is null/nd2 — path may still be empty while editing.
  return { type: "nd2", path };
}

export function dataSourceKindFromAssayData(data: AssayData): StudioDataSourceKind {
  return data.type;
}

export function buildStudioAssayJson({
  assayId,
  name,
  dataSourceKind,
  dataPath,
  folderTemplate,
  workspacePath,
  intervalValue,
  intervalUnit,
  samples,
  analysis,
  sampleRowToDisk,
}: {
  assayId: StudioAssayType;
  name: string;
  dataSourceKind: StudioDataSourceKind;
  dataPath: string;
  folderTemplate: { subfolder: string; filename: string };
  workspacePath: string;
  intervalValue: number | null;
  intervalUnit: StudioIntervalUnit;
  samples: StudioAssaySampleRow[];
  analysis?: AssayAnalysisConfig | null;
  sampleRowToDisk: (row: StudioAssaySampleRow) => AssaySampleRow;
}): StudioAssayJson {
  const derivedChannels = analysisChannelsFromSamples(samples);
  const analysisSection = analysisConfigForAssay(assayId, {
    ...analysis,
    ...derivedChannels,
  });
  return {
    type: assayId,
    name,
    data: buildAssayData({
      kind: dataSourceKind ?? inferDataSourceKind(dataPath),
      path: dataPath,
      folderTemplate,
    }),
    workspace: { path: workspacePath },
    interval: { value: intervalValue, unit: intervalUnit },
    samples: samples.map(sampleRowToDisk),
    ...(analysisSection ? { analysis: analysisSection } : {}),
  };
}

/** Display label for memory / work-session UI (not persisted as assayLabel). */
export function assayDisplayLabel(assay: Pick<StudioAssayJson, "type" | "name">): string {
  const name = assay.name.trim();
  return name || ASSAY_CHOICE_LABEL[assay.type];
}

export function parseStudioAssayJson(
  contents: string,
  sampleRowFromDisk: (
    row: AssaySampleRow,
    analysis?: AssayAnalysisConfig | null,
  ) => StudioAssaySampleRowFields,
  sampleRowToDisk: (row: StudioAssaySampleRow) => AssaySampleRow,
): StudioAssayJson {
  const decoded = decodeJsonResult(AssayJsonFileSchema)(contents);
  if (Either.isLeft(decoded)) {
    throw new Error(`Invalid assay.json: ${formatSchemaError(decoded.left)}`);
  }

  const root = decoded.right;
  const samples: StudioAssaySampleRow[] = root.samples.map((row, index) => ({
    id: `sample:${index}`,
    ...sampleRowFromDisk(row, root.analysis),
  }));

  const folderTemplate =
    root.data.type === "folder"
      ? root.data.template
      : {
          subfolder: DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
          filename: DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
        };

  return buildStudioAssayJson({
    assayId: root.type,
    name: root.name,
    dataSourceKind: dataSourceKindFromAssayData(root.data),
    dataPath: root.data.path,
    folderTemplate,
    workspacePath: root.workspace.path,
    intervalValue: root.interval.value,
    intervalUnit: root.interval.unit,
    samples,
    analysis: root.analysis,
    sampleRowToDisk,
  });
}
