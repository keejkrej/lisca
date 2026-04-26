import type {
  RawFrameRequest,
  RoiFrameRequest,
  RoiIndexEntry,
  ViewerDataPort,
  ViewerSource,
} from "lisca/shared/contracts";
import { useMemo } from "react";
import { SidebarField, SidebarSection, SidebarValue, toErrorMessage } from "lisca/shared/react";
import { useRawFrameAnnotationMetaQuery, useRoiFrameAnnotationMetaQuery } from "lisca/shared/query";
import { Button } from "lisca/shared/ui";

import { useRoiAnnotationContext } from "../annotation/RoiAnnotationContext";

import type { AnnotatorDataMode } from "./AnnotatorNavbar";

interface AnnotatorOutputsSectionProps {
  backend: ViewerDataPort;
  workspacePath: string | null;
  mode: AnnotatorDataMode;
  roiRequest?: RoiFrameRequest | null;
  roiEntry?: RoiIndexEntry | null;
  rawRequest?: RawFrameRequest | null;
  source?: ViewerSource | null;
}

export default function AnnotatorOutputsSection({
  backend,
  workspacePath,
  mode,
  roiRequest = null,
  roiEntry = null,
  rawRequest = null,
  source = null,
}: AnnotatorOutputsSectionProps) {
  const { handleSave, saving, dirty, canEdit, loading, saveError } = useRoiAnnotationContext();

  const roiMetaQuery = useRoiFrameAnnotationMetaQuery(backend, workspacePath, roiRequest, {
    enabled: mode === "roi" && Boolean(workspacePath && roiRequest),
  });
  const rawMetaQuery = useRawFrameAnnotationMetaQuery(backend, workspacePath, source, rawRequest, {
    enabled: mode === "raw" && Boolean(workspacePath && source && rawRequest),
  });

  const diskAnnotationSummary = useMemo(() => {
    if (!workspacePath) return "—";
    if (mode === "roi") {
      if (!roiRequest) return "—";
      if (roiMetaQuery.isPending) return "Loading…";
      if (roiMetaQuery.isError) return toErrorMessage(roiMetaQuery.error);
      const a = roiMetaQuery.data;
      if (!a) return "—";
      const cls = a.classificationLabelId ?? "no class";
      const mask = a.maskPath ? "mask on disk" : "no mask";
      return `${cls} · ${mask}`;
    }
    if (!rawRequest || !source) return "—";
    if (rawMetaQuery.isPending) return "Loading…";
    if (rawMetaQuery.isError) return toErrorMessage(rawMetaQuery.error);
    const a = rawMetaQuery.data;
    if (!a) return "—";
    const cls = a.classificationLabelId ?? "no class";
    const mask = a.maskPath ? "mask on disk" : "no mask";
    return `${cls} · ${mask}`;
  }, [
    mode,
    rawMetaQuery.data,
    rawMetaQuery.error,
    rawMetaQuery.isError,
    rawMetaQuery.isPending,
    rawRequest,
    roiMetaQuery.data,
    roiMetaQuery.error,
    roiMetaQuery.isError,
    roiMetaQuery.isPending,
    roiRequest,
    source,
    workspacePath,
  ]);

  const labelsRel = "annotations/labels.json";
  const sourceRel = "annotations/raw/source.json";

  const roiStem =
    roiRequest != null ? `C${roiRequest.channel}_T${roiRequest.time}_Z${roiRequest.z}` : null;
  const rawStem =
    rawRequest != null ? `C${rawRequest.channel}_T${rawRequest.time}_Z${rawRequest.z}` : null;

  const frameFileRel =
    mode === "roi"
      ? roiRequest && roiEntry
        ? `roi/Pos${roiRequest.pos}/${roiEntry.fileName}`
        : "roi/Pos{n}/Roi{m}.tif"
      : source?.path ?? "No source selected";

  const annotationJsonRel =
    mode === "roi"
      ? roiRequest && roiStem
        ? `annotations/roi/Pos${roiRequest.pos}/Roi${roiRequest.roi}/${roiStem}.json`
        : "annotations/roi/Pos{n}/Roi{m}/C{c}_T{t}_Z{z}.json"
      : rawRequest && rawStem
        ? `annotations/raw/Pos${rawRequest.pos}/${rawStem}.json`
        : "annotations/raw/Pos{n}/C{c}_T{t}_Z{z}.json";

  const maskRel =
    mode === "roi"
      ? roiRequest && roiStem
        ? `annotations/roi/Pos${roiRequest.pos}/Roi${roiRequest.roi}/${roiStem}.png`
        : "annotations/roi/Pos{n}/Roi{m}/C{c}_T{t}_Z{z}.png"
      : rawRequest && rawStem
        ? `annotations/raw/Pos${rawRequest.pos}/${rawStem}.png`
        : "annotations/raw/Pos{n}/C{c}_T{t}_Z{z}.png";

  return (
    <SidebarSection title="Outputs">
      <SidebarField label="Labels file">
        <SidebarValue monospace>{labelsRel}</SidebarValue>
      </SidebarField>
      {mode === "raw" ? (
        <SidebarField label="Bound source">
          <SidebarValue monospace>{sourceRel}</SidebarValue>
        </SidebarField>
      ) : null}
      <SidebarField label={mode === "roi" ? "Frame file" : "Source"}>
        <SidebarValue monospace>{frameFileRel}</SidebarValue>
      </SidebarField>
      <SidebarField label="Annotation JSON">
        <SidebarValue monospace>{annotationJsonRel}</SidebarValue>
      </SidebarField>
      <SidebarField label="Mask PNG">
        <SidebarValue monospace>{maskRel}</SidebarValue>
      </SidebarField>
      <SidebarField label="On disk (metadata)">
        <SidebarValue className="text-[11px] leading-snug">{diskAnnotationSummary}</SidebarValue>
      </SidebarField>
      {saveError ? <p className="text-[11px] leading-snug text-red-200">{saveError}</p> : null}
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-full text-xs"
        disabled={!canEdit || loading || saving || !dirty}
        onClick={() => void handleSave()}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </SidebarSection>
  );
}
