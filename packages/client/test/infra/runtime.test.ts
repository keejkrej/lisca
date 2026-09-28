import { Effect } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { ClientError } from "../../src/infra/client-error";
import { toFetchErrorMessage } from "../../src/infra/errors";
import { runClientEffect } from "../../src/infra/runtime";

describe("runClientEffect", () => {
  it("rejects with the original tagged failure and preserves its nested TypeError", async () => {
    const networkFailure = new TypeError("fetch failed");
    const failure = new ClientError({
      message: "Transport error (GET http://127.0.0.1:8765/tasks/operations)",
      cause: networkFailure,
    });

    const caught = await runClientEffect(Effect.fail(failure)).catch((error: unknown) => error);

    expect(caught).toBe(failure);
    expect(caught).toBeInstanceOf(ClientError);
    expect((caught as ClientError).cause).toBe(networkFailure);
    expect(toFetchErrorMessage(caught, "Scan failed")).toBe("Scan failed: server unreachable");
  });

  it("rejects with the original TypeError across the Promise boundary", async () => {
    const failure = new TypeError("Failed to fetch");

    const caught = await runClientEffect(Effect.fail(failure)).catch((error: unknown) => error);

    expect(caught).toBe(failure);
    expect(caught).toBeInstanceOf(TypeError);
  });
});
