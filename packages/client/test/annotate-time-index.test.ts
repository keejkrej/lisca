import { describe, expect, it } from "vite-plus/test";

import { resolveAnnotateTimeIndex } from "../src/session/use-annotate-session";

describe("resolveAnnotateTimeIndex", () => {
  it("stays on the first frame unless the host asks for the last", () => {
    expect(
      resolveAnnotateTimeIndex({
        current: 0,
        timeCount: 4,
        preference: "first",
        timeChosen: false,
      }),
    ).toBe(0);
  });

  it("snaps an untouched zero to the last frame", () => {
    expect(
      resolveAnnotateTimeIndex({
        current: 0,
        timeCount: 4,
        preference: "last",
        timeChosen: false,
      }),
    ).toBe(3);
  });

  it("keeps an explicit frame, including frame 0", () => {
    expect(
      resolveAnnotateTimeIndex({
        current: 0,
        timeCount: 4,
        preference: "last",
        timeChosen: true,
      }),
    ).toBe(0);
    expect(
      resolveAnnotateTimeIndex({
        current: 2,
        timeCount: 4,
        preference: "last",
        timeChosen: false,
      }),
    ).toBe(2);
  });

  it("clamps a stored index into the scan", () => {
    expect(
      resolveAnnotateTimeIndex({
        current: 9,
        timeCount: 4,
        preference: "last",
        timeChosen: true,
      }),
    ).toBe(3);
  });
});
