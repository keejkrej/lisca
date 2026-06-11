export const RESULT_PDF_FILE_NAME = "result.pdf";

export function pdfBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildResultPdfFromCaptures(
  _pages: Array<{ title: string; imageBase64: string; width: number; height: number }>,
): Uint8Array {
  return new TextEncoder().encode("%PDF-1.4\n%%EOF");
}
