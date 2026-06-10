import type { StudioAssayJson } from "@lisca/contracts";
import { runClientEffect } from "@lisca/client/runtime";

import { studioClient } from "../api/studio-port";

export async function assayJsonExists(saveTo: string): Promise<boolean> {
  try {
    const list = await runClientEffect(studioClient.listDirectory(saveTo));
    return list.entries.some((entry) => !entry.isDirectory && entry.name === "assay.json");
  } catch {
    return false;
  }
}

export async function writeStudioAssayJson(
  saveTo: string,
  assayJson: StudioAssayJson,
): Promise<void> {
  await runClientEffect(studioClient.saveAssayJson(saveTo, JSON.stringify(assayJson, null, 2)));
}
