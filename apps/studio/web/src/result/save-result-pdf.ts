import { resultGridColumns } from "@lisca/analysis";
import { jsPDF } from "jspdf";

export const RESULT_PDF_FILE_NAME = "results.pdf";

export type ResultPdfPlot = { label: string; bytes: Uint8Array };
export type ResultPdfGroup = { title: string; plots: ResultPdfPlot[] };
export type ResultPdfSection = { title: string; groups: ResultPdfGroup[] };

const MARGIN = 32;
const TITLE_SIZE = 16;
const LABEL_SIZE = 9;
const GAP = 12;

const GREEK: Record<string, string> = { τ: "tau", μ: "mu", σ: "sigma", Δ: "Delta", α: "alpha" };

/** jsPDF's built-in Helvetica is Latin-1 only; spell out Greek letters and drop anything else. */
export function pdfSafeText(text: string): string {
  return text.replace(/[^ -\u00ff]/g, (char) => GREEK[char] ?? "");
}

/**
 * Lay plot PNGs straight into a landscape A4 PDF: one page per plot group, headed
 * "Section · Group", with the plots in a ⌈√n⌉-column grid scaled to fit the page.
 * Yields between pages so the UI can repaint while large exports encode.
 */
export async function buildResultPdf(sections: ResultPdfSection[]): Promise<Uint8Array> {
  const pages = sections.flatMap((section) =>
    section.groups
      .filter((group) => group.plots.length > 0)
      .map((group) => ({ title: `${section.title} · ${group.title}`, plots: group.plots })),
  );
  if (pages.length === 0) {
    throw new Error("No plots to export");
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const gridTop = MARGIN + TITLE_SIZE + GAP;
  const gridWidth = pageWidth - MARGIN * 2;
  const gridHeight = pageHeight - gridTop - MARGIN;
  const labelHeight = LABEL_SIZE + 4;

  await pages.reduce<Promise<void>>(async (previous, page, pageIndex) => {
    await previous;
    if (pageIndex > 0) {
      pdf.addPage();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(TITLE_SIZE);
    pdf.text(pdfSafeText(page.title), MARGIN, MARGIN + TITLE_SIZE);

    const columns = resultGridColumns(page.plots.length);
    const rows = Math.ceil(page.plots.length / columns);
    const cellWidth = (gridWidth - GAP * (columns - 1)) / columns;
    const cellHeight = (gridHeight - GAP * (rows - 1)) / rows;

    page.plots.forEach((plot, index) => {
      const x = MARGIN + (index % columns) * (cellWidth + GAP);
      const y = gridTop + Math.floor(index / columns) * (cellHeight + GAP);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(LABEL_SIZE);
      pdf.text(pdfSafeText(plot.label), x, y + LABEL_SIZE);

      const image = pdf.getImageProperties(plot.bytes);
      const scale = Math.min(cellWidth / image.width, (cellHeight - labelHeight) / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      pdf.addImage(
        plot.bytes,
        "PNG",
        x + (cellWidth - drawWidth) / 2,
        y + labelHeight,
        drawWidth,
        drawHeight,
      );
    });
  }, Promise.resolve());

  return new Uint8Array(pdf.output("arraybuffer"));
}
