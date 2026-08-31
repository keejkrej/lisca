import { describe, expect, it } from "vitest";

import {
  TRANSFECTION_AUC_CSV_COLUMNS,
  TRANSFECTION_AUC_XLSX_COLUMNS,
  TRANSFECTION_FIT_CSV_COLUMNS,
  TRANSFECTION_FIT_XLSX_COLUMNS,
  TRANSFECTION_TRACE_CSV_COLUMNS,
  TRANSFECTION_TRACE_XLSX_COLUMNS,
  TRANSFECTION_XLSX_POS_COLUMN,
} from "../../../src/assays/transfection/catalog";

const INTERNAL_FIT_FIELDS = [
  "protein_degradation_rate",
  "mrna_degradation_rate",
  "expression_amplitude",
] as const;

describe("transfection CSV contract", () => {
  it("keeps QC columns on traces", () => {
    expect(TRANSFECTION_TRACE_CSV_COLUMNS).toEqual([
      "roi",
      "t",
      "area",
      "background",
      "sum",
      "corrected",
    ]);
  });

  it("writes public fit columns without internal solver fields", () => {
    expect(TRANSFECTION_FIT_CSV_COLUMNS).toEqual([
      "roi",
      "baseline_intensity",
      "onset_time",
      "expression_rate",
      "mrna_lifetime",
      "protein_lifetime",
      "success",
    ]);
    expect(TRANSFECTION_AUC_CSV_COLUMNS).toEqual(["roi", "auc"]);
    expect(TRANSFECTION_XLSX_POS_COLUMN).toBe("pos");
    expect(TRANSFECTION_TRACE_XLSX_COLUMNS).toEqual([
      "pos",
      "roi",
      "t",
      "area",
      "background",
      "sum",
      "corrected",
    ]);
    expect(TRANSFECTION_AUC_XLSX_COLUMNS).toEqual(["pos", "roi", "auc"]);
    expect(TRANSFECTION_FIT_XLSX_COLUMNS).toEqual([
      "pos",
      "roi",
      "baseline_intensity",
      "onset_time",
      "expression_rate",
      "mrna_lifetime",
      "protein_lifetime",
      "success",
    ]);
    for (const column of INTERNAL_FIT_FIELDS) {
      expect(TRANSFECTION_FIT_CSV_COLUMNS).not.toContain(column);
      expect(TRANSFECTION_FIT_XLSX_COLUMNS).not.toContain(column);
    }
    expect(TRANSFECTION_FIT_CSV_COLUMNS).not.toContain("slide_channel");
    expect(TRANSFECTION_FIT_CSV_COLUMNS).not.toContain("sample");
    expect(TRANSFECTION_FIT_XLSX_COLUMNS).not.toContain("slide_channel");
    expect(TRANSFECTION_FIT_XLSX_COLUMNS).not.toContain("sample");
  });
});
