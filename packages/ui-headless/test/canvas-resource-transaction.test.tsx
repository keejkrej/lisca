import { cleanup, render } from "@solidjs/testing-library";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCanvasResourceTransaction } from "../src/canvas-resource-transaction";

afterEach(() => {
  cleanup();
});

describe("useCanvasResourceTransaction", () => {
  it("restarts forever when the effect depends on an unstable context object that start() invalidates", async () => {
    const load = vi.fn(
      (_signal: AbortSignal) =>
        new Promise<{ ok: true }>(() => {
          /* pending until aborted */
        }),
    );

    expect(() => {
      render(() => {
        const [state, setState] = createSignal({ key: "roi-1", loading: false, nonce: 0 });
        const context = createMemo(() => ({
          key: state().key,
          nonce: state().nonce,
        }));
        const transact = useCanvasResourceTransaction();

        createEffect(() => {
          const key = context().key;
          void key;
          const cleanupTransaction = transact({
            start: () =>
              setState((current) => ({ ...current, loading: true, nonce: current.nonce + 1 })),
            load,
            commit: () => undefined,
            reject: () => undefined,
          });
          onCleanup(cleanupTransaction);
        });

        return null;
      });
    }).toThrow(RangeError);
  });

  it("does not restart when the effect depends on a stable primitive key", async () => {
    const load = vi.fn(
      (_signal: AbortSignal) =>
        new Promise<{ ok: true }>(() => {
          /* pending until aborted */
        }),
    );

    render(() => {
      const [state, setState] = createSignal({ key: "roi-1", loading: false, nonce: 0 });
      const context = createMemo(() => ({
        key: state().key,
        nonce: state().nonce,
      }));
      const activeKey = createMemo(() => context().key);
      const transact = useCanvasResourceTransaction();

      createEffect(() => {
        const key = activeKey();
        void key;
        const cleanupTransaction = transact({
          start: () =>
            setState((current) => ({ ...current, loading: true, nonce: current.nonce + 1 })),
          load,
          commit: () => undefined,
          reject: () => undefined,
        });
        onCleanup(cleanupTransaction);
      });

      return null;
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(load.mock.calls.length).toBe(1);
    expect(load.mock.calls[0]?.[0]?.aborted).toBe(false);
  });
});
