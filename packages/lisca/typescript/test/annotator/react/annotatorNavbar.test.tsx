import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import AnnotatorNavbar from "../../../src/annotator/react/app/AnnotatorNavbar";

describe("AnnotatorNavbar", () => {
  test("renders ROI/raw data mode controls and workspace/source summaries", () => {
    const html = renderToStaticMarkup(
      <AnnotatorNavbar
        workspacePath="/tmp/workspace"
        source={{ kind: "nd2", path: "/tmp/source.nd2" }}
        dataMode="raw"
        annotationMode="semantic"
        onDataModeChange={() => {}}
        onAnnotationModeChange={() => {}}
        onPickWorkspace={async () => {}}
        onOpenTif={async () => {}}
        onOpenJpg={async () => {}}
        onOpenNd2={async () => {}}
        onOpenCzi={async () => {}}
        onClearSource={() => {}}
      />,
    );

    expect(html).toContain("ROI");
    expect(html).toContain("Raw");
    expect(html).toContain("Workspace");
    expect(html).toContain("Source");
    expect(html).toContain("ND2");
  });
});
