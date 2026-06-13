import { describe, expect, it, vi } from "vitest";

import { runSelectionChange } from "../src/hooks/annotate-selection-guard";

describe("runSelectionChange", () => {
  it("runs fn when sync guard allows", async () => {
    const fn = vi.fn();
    const ran = await runSelectionChange(true, fn);
    expect(ran).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("skips fn when sync guard denies", async () => {
    const fn = vi.fn();
    const ran = await runSelectionChange(false, fn);
    expect(ran).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it("skips fn when async guard denies", async () => {
    const fn = vi.fn();
    const ran = await runSelectionChange(Promise.resolve(false), fn);
    expect(ran).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it("runs fn when async guard allows", async () => {
    const fn = vi.fn();
    const ran = await runSelectionChange(Promise.resolve(true), fn);
    expect(ran).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
  });
});
