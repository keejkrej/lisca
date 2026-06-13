import { jsPDF } from "jspdf";

export const RESULT_PDF_FILE_NAME = "results.pdf";

export type ResultPdfCapturePage = {
  title: string;
  imageBase64: string;
  width: number;
  height: number;
};

export function pdfBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function normalizeBase64Image(imageBase64: string): string {
  const commaIndex = imageBase64.indexOf(",");
  return commaIndex >= 0 ? imageBase64.slice(commaIndex + 1) : imageBase64;
}

export function buildResultPdfFromCaptures(pages: ResultPdfCapturePage[]): Uint8Array {
  if (pages.length === 0) {
    throw new Error("No pages to export");
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (const [index, page] of pages.entries()) {
    const imgData = normalizeBase64Image(page.imageBase64);
    let drawWidth = pageWidth;
    let drawHeight = (page.height * drawWidth) / page.width;

    if (drawHeight > pageHeight) {
      drawHeight = pageHeight;
      drawWidth = (page.width * drawHeight) / page.height;
    }

    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    if (index > 0) {
      pdf.addPage();
    }

    pdf.addImage(`data:image/jpeg;base64,${imgData}`, "JPEG", x, y, drawWidth, drawHeight);
  }

  return new Uint8Array(pdf.output("arraybuffer"));
}

export function waitForNativeExportRender(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        globalThis.setTimeout(resolve, 400);
      });
    });
  });
}
