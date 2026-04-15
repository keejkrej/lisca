import { useMemo } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { RoiPositionScan } from "lisca/shared/contracts";
import { Button } from "lisca/shared/ui";
import { SidebarField, SidebarSection, SidebarValue } from "lisca/shared/react";
import { roiStore, workspaceStore } from "lisca/shared/state";

import { useRoiAnnotationContext } from "../annotation/RoiAnnotationContext";

function currentPositionScan(scan: { positions: RoiPositionScan[] } | null, pos: number | null) {
  if (!scan || pos == null) return null;
  return scan.positions.find((entry) => entry.pos === pos) ?? null;
}

/** Workspace-relative paths (forward slashes) for annotation outputs; mirrors Rust `domain.rs`. */
export default function AnnotatorOutputsSection() {
  const workspacePath = useStore(workspaceStore, (state) => state.workspacePath);
  const { scan, selection, selectedRoi } = useStore(
    roiStore,
    useShallow((state) => ({
      scan: state.scan,
      selection: state.selection,
      selectedRoi: state.selectedRoi,
    })),
  );

  const position = useMemo(
    () => currentPositionScan(scan, selection?.pos ?? null),
    [scan, selection?.pos],
  );
  const roiEntries = position?.rois ?? [];
  const selectedRoiEntry = useMemo(
    () => roiEntries.find((roi) => roi.roi === selectedRoi) ?? null,
    [roiEntries, selectedRoi],
  );

  const request = useMemo(() => {
    if (!selection || !selectedRoiEntry) return null;
    return {
      pos: selection.pos,
      roi: selectedRoiEntry.roi,
      channel: selection.channel,
      time: selection.time,
      z: selection.z,
    };
  }, [selectedRoiEntry, selection]);

  const { handleSave, saving, dirty, canEdit, loading, saveError } = useRoiAnnotationContext();

  const stem =
    request != null ? `C${request.channel}_T${request.time}_Z${request.z}` : null;
  const labelsRel = "annotations/labels.json";
  const roiFolderRel = selection ? `roi/Pos${selection.pos}` : "roi/Pos{n}";
  const roiFileRel =
    selection && selectedRoiEntry
      ? `roi/Pos${selection.pos}/${selectedRoiEntry.fileName}`
      : "roi/Pos{n}/Roi{m}.tif";
  const annotationJsonRel =
    request && stem
      ? `annotations/roi/Pos${request.pos}/Roi${request.roi}/${stem}.json`
      : "annotations/roi/Pos{n}/Roi{m}/C{c}_T{t}_Z{z}.json";
  const maskRel =
    request && stem
      ? `annotations/roi/Pos${request.pos}/Roi${request.roi}/${stem}.png`
      : "annotations/roi/Pos{n}/Roi{m}/C{c}_T{t}_Z{z}.png";

  return (
    <SidebarSection title="Outputs">
      <SidebarField label="Labels file">
        <SidebarValue monospace>{labelsRel}</SidebarValue>
      </SidebarField>
      <SidebarField label="ROI folder">
        <SidebarValue monospace>{roiFolderRel}</SidebarValue>
      </SidebarField>
      <SidebarField label="Frame file">
        <SidebarValue monospace>{roiFileRel}</SidebarValue>
      </SidebarField>
      <SidebarField label="Annotation JSON">
        <SidebarValue monospace>{annotationJsonRel}</SidebarValue>
      </SidebarField>
      <SidebarField label="Mask PNG">
        <SidebarValue monospace>{maskRel}</SidebarValue>
      </SidebarField>
      {saveError ? (
        <p className="text-[11px] leading-snug text-red-200">{saveError}</p>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-full text-xs"
        disabled={!workspacePath || !canEdit || loading || saving || !dirty}
        onClick={() => void handleSave()}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </SidebarSection>
  );
}
