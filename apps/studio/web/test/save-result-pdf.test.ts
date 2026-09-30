import { describe, expect, it } from "vite-plus/test";

import { buildResultPdf, pdfSafeText } from "../src/analysis/save-result-pdf";

// 1×1 white PNG.
const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC",
  ),
  (char) => char.charCodeAt(0),
);

function pageCount(bytes: Uint8Array): number {
  return new TextDecoder("latin1").decode(bytes).match(/\/Type \/Page\b/g)?.length ?? 0;
}

describe("buildResultPdf", () => {
  it("puts each plot group on its own page", async () => {
    const plots = (labels: string[]) => labels.map((label) => ({ label, bytes: PNG }));
    const bytes = await buildResultPdf([
      {
        title: "Traces",
        groups: [
          { title: "Intensity traces", plots: plots(["A", "B", "C", "D", "E", "F"]) },
          { title: "Mask area", plots: plots(["A", "B"]) },
        ],
      },
      { title: "Parameters", groups: [{ title: "All samples", plots: plots(["AUC"]) }] },
    ]);

    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
    expect(pageCount(bytes)).toBe(3);
  });

  it("rejects an export with no plots", async () => {
    await expect(
      buildResultPdf([{ title: "Traces", groups: [{ title: "Traces", plots: [] }] }]),
    ).rejects.toThrow("No plots to export");
  });

  it("spells out Greek letters the built-in PDF font cannot draw", () => {
    expect(pdfSafeText("mRNA lifetime τ_mRNA · t0")).toBe("mRNA lifetime tau_mRNA · t0");
  });
});
