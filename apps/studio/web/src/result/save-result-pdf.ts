import type { StudioAnalysisCsvFile } from "@lisca/contracts";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

import {
  collectDisplayedParameterPanels,
  collectTimeseriesPanels,
  type ResultPanel,
  type TimeseriesPanel,
} from "@lisca/analysis";

export const RESULT_PDF_FILE_NAME = "results.pdf";

export async function loadAllResultPlotPanels(
  analysisResultFiles: StudioAnalysisCsvFile[],
  loadPanelsForFile: (file: StudioAnalysisCsvFile) => Promise<ResultPanel[]>,
): Promise<{ timeseriesPanels: TimeseriesPanel[]; parameterPanels: ResultPanel[] }> {
  const timeseriesFiles = analysisResultFiles.filter((file) => file.kind === "timeseries");
  const parameterFiles = analysisResultFiles.filter((file) => file.kind !== "timeseries");

  const [timeseriesByFile, parametersByFile] = await Promise.all([
    Promise.all(timeseriesFiles.map((file) => loadPanelsForFile(file))),
    Promise.all(parameterFiles.map((file) => loadPanelsForFile(file))),
  ]);

  return {
    timeseriesPanels: collectTimeseriesPanels(timeseriesByFile),
    parameterPanels: collectDisplayedParameterPanels(parametersByFile),
  };
}

export function waitForExportPlots(container: HTMLElement, expectedPlots: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tick = () => {
      const count = container.querySelectorAll("svg").length;
      if (count >= expectedPlots) {
        resolve();
        return;
      }

      attempts += 1;
      if (attempts >= 100) {
        reject(new Error("Timed out waiting for plots to render"));
        return;
      }

      window.setTimeout(tick, 100);
    };

    window.setTimeout(tick, 150);
  });
}

export async function buildResultPdf(pages: HTMLElement[]): Promise<Uint8Array> {
  if (pages.length === 0) {
    throw new Error("No pages to export");
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  await pages.reduce<Promise<void>>(async (previous, page, index) => {
    await previous;

    const canvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    let drawWidth = pageWidth;
    let drawHeight = (canvas.height * drawWidth) / canvas.width;

    if (drawHeight > pageHeight) {
      drawHeight = pageHeight;
      drawWidth = (canvas.width * drawHeight) / canvas.height;
    }

    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    if (index > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, "JPEG", x, y, drawWidth, drawHeight);
  }, Promise.resolve());

  return new Uint8Array(pdf.output("arraybuffer"));
}

export function pdfBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
