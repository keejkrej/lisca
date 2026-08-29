import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { createAppRuntime } from "../src/atoms/runtime";
import { createSourceQueryAtoms } from "../src/atoms/source-queries";

describe("query atom cache policy", () => {
  it("defers the port call and disposes inactive family keys after five minutes", () => {
    const scanSource = vi.fn(() => Effect.die("not evaluated"));
    const atoms = createSourceQueryAtoms(createAppRuntime(), { scanSource });

    const atom = atoms.scanSourceAtom(JSON.stringify({ kind: "nd2", path: "/data/a.nd2" }));

    expect(scanSource).not.toHaveBeenCalled();
    expect(atom.keepAlive).toBe(false);
    expect(atom.idleTTL).toBe(5 * 60 * 1_000);
  });
});
