import type { AlignerSource } from "@lisca/contracts";
import type { StudioAssayJson, StudioDataSourceKind } from "@lisca/contracts/assay";

import { inferDataSourceKind } from "../studio/studio-assay-json";
import { toStudioSource } from "../studio/source";
import { touchStudioWorkSessionFromAssayPath } from "./work-session";

export type RestoreStudioWorkSessionArgs = {
  assayJsonPath: string;
  readAssayJson: (path: string) => Promise<StudioAssayJson>;
  loadAssayJson: (assayJson: StudioAssayJson) => void;
  setShellWorkspacePath: (path: string | null) => void;
  setAlignWorkspacePath: (path: string | null) => void;
  setAnnotateWorkspacePath: (path: string | null) => void;
  setAlignSource: (source: AlignerSource | null) => void;
  resumePendingRuns: (workspacePath: string) => Promise<void>;
};

export async function restoreStudioWorkSession({
  assayJsonPath,
  readAssayJson,
  loadAssayJson,
  setShellWorkspacePath,
  setAlignWorkspacePath,
  setAnnotateWorkspacePath,
  setAlignSource,
  resumePendingRuns,
}: RestoreStudioWorkSessionArgs): Promise<void> {
  const assayJson = await readAssayJson(assayJsonPath);
  loadAssayJson(assayJson);

  const workspacePath = assayJson.info1.saveTo.trim() || null;
  const dataSourceKind: StudioDataSourceKind =
    assayJson.dataSourceKind ?? inferDataSourceKind(assayJson.info1.dataPath);
  const source = toStudioSource(dataSourceKind, assayJson.info1);

  setShellWorkspacePath(workspacePath);
  setAlignWorkspacePath(workspacePath);
  setAnnotateWorkspacePath(workspacePath);
  setAlignSource(source);

  touchStudioWorkSessionFromAssayPath(assayJsonPath, assayJson.assayLabel);
  if (workspacePath) {
    await resumePendingRuns(workspacePath);
  }
}
