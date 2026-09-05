import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { Atom, AtomRegistry } from "effect/unstable/reactivity";

import {
  createAppRuntime,
  createStudioAnalysisAtoms,
  invalidateAfter,
  ReactivityKeys,
} from "../src/atoms";

const WS = "/workspace";

type StubFile = { kind: string; fileName: string; path: string; csv: string };

type StubCurrent = {
  requestId: string;
  status: "completed";
  stage: "completed";
  progress: number;
  message: null;
  error: null;
  resultFiles: StubFile[];
};

function runProgress(runId: string, plotPath: string): StubCurrent {
  return {
    requestId: runId,
    status: "completed",
    stage: "completed",
    progress: 100,
    message: null,
    error: null,
    resultFiles: [
      {
        kind: "plot",
        fileName: plotPath.split("/").pop() ?? plotPath,
        path: plotPath,
        csv: "",
      },
    ],
  };
}

function makeStubPort() {
  const stub = {
    calls: 0,
    current: runProgress("run-1", "results/run-1/auc.png") as StubCurrent,
    getAnalysisResults(_workspacePath: string) {
      stub.calls += 1;
      return Effect.succeed(stub.current);
    },
  };
  return stub;
}

function awaitResult(registry: AtomRegistry.AtomRegistry, atom: Atom.Atom<unknown>) {
  return Effect.runPromise(
    AtomRegistry.getResult(registry, atom as never, { suspendOnWaiting: true }) as never,
  ) as Promise<StubCurrent>;
}

describe("analysisResultsAtom cache", () => {
  it("returns the stale cached value on resubscribe within the idle TTL", async () => {
    const runtime = createAppRuntime();
    const stub = makeStubPort();
    const { analysisResultsAtom } = createStudioAnalysisAtoms(runtime, stub as never);
    const registry = AtomRegistry.make();
    const atom = analysisResultsAtom(WS);

    const sub1 = registry.subscribe(atom, () => {});
    const value1 = await awaitResult(registry, atom as never);
    sub1();

    expect(stub.calls).toBe(1);
    expect(value1.resultFiles[0].path).toBe("results/run-1/auc.png");

    stub.current = runProgress("run-2", "results/run-2/auc.png");

    const sub2 = registry.subscribe(atom, () => {});
    const value2 = await awaitResult(registry, atom as never);
    sub2();

    expect(stub.calls).toBe(1);
    expect(value2.resultFiles[0].path).toBe("results/run-1/auc.png");
  });

  it("refetches the on-disk manifest after invalidation of the analysis-results reactivity key", async () => {
    const runtime = createAppRuntime();
    const stub = makeStubPort();
    const { analysisResultsAtom } = createStudioAnalysisAtoms(runtime, stub as never);
    const registry = AtomRegistry.make();
    const atom = analysisResultsAtom(WS);

    const sub1 = registry.subscribe(atom, () => {});
    const value1 = await awaitResult(registry, atom as never);
    sub1();

    expect(stub.calls).toBe(1);
    expect(value1.resultFiles[0].path).toBe("results/run-1/auc.png");

    stub.current = runProgress("run-2", "results/run-2/auc.png");

    const invalidateRun = runtime.fn(() =>
      invalidateAfter(Effect.succeed(undefined), [ReactivityKeys.analysisResults(WS)]),
    );
    registry.set(invalidateRun, undefined);
    await Effect.runPromise(
      AtomRegistry.getResult(registry, invalidateRun as never, {
        suspendOnWaiting: true,
      }) as never,
    );

    const sub2 = registry.subscribe(atom, () => {});
    const value2 = await awaitResult(registry, atom as never);
    sub2();

    expect(stub.calls).toBe(2);
    expect(value2.resultFiles[0].path).toBe("results/run-2/auc.png");
  });

  it("the startAnalysis mutation atom throws the underlying error and does not invalidate", async () => {
    const runtime = createAppRuntime();
    const port = makeStubPort();
    let startCalls = 0;
    const startErrorBody = new Error("server failed to start analysis");
    const stub = {
      ...port,
      startAnalysis() {
        startCalls += 1;
        return Effect.fail(startErrorBody);
      },
    } as unknown as Parameters<typeof createStudioAnalysisAtoms>[1];
    const { analysisResultsAtom } = createStudioAnalysisAtoms(runtime, stub);
    const registry = AtomRegistry.make();
    const atom = analysisResultsAtom(WS);

    const startMutation = runtime.fn((input: { workspacePath: string; requestId: string }) =>
      invalidateAfter(stub.startAnalysis(input), [
        ReactivityKeys.analysisResults(input.workspacePath),
      ]),
    );

    const sub1 = registry.subscribe(atom, () => {});
    await awaitResult(registry, atom as never);
    sub1();
    expect(port.calls).toBe(1);

    let caught: unknown = null;
    try {
      registry.set(startMutation, { workspacePath: WS, requestId: "run-2" });
      await Effect.runPromise(
        AtomRegistry.getResult(registry, startMutation as never, {
          suspendOnWaiting: true,
        }) as never,
      );
    } catch (cause) {
      caught = cause;
    }

    expect(startCalls).toBe(1);
    expect(caught).toBe(startErrorBody);
    expect(port.calls).toBe(1);
  });
});
