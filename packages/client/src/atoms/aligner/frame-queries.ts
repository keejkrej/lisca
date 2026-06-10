import type { AlignerSource, ContrastWindow, FrameRequest } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { normalizeFrameContrast } from "@lisca/utils";
import { Atom, type Result } from "@effect-atom/atom-react";
import { Effect } from "effect";

import type { ClientError } from "../../infra/client-error";
import { frameCacheKey } from "../../frame-loader";
import { AlignerPortService } from "../ports";
import { ReactivityKeys } from "../reactivity";
import type { AppRuntime } from "../runtime";

export type LoadFrameInput = {
  source: AlignerSource;
  request: FrameRequest;
  contrast: ContrastWindow | null;
};

export function loadFrameInputKey(input: LoadFrameInput): string {
  return JSON.stringify(input);
}

export type AlignerFrameQueryAtoms = {
  loadFrameAtom: (inputKey: string) => Atom.Atom<Result.Result<FrameResult, ClientError>>;
};

class FrameCache {
  private readonly frames = new Map<string, FrameResult>();

  constructor(private readonly maxEntries: number) {}

  get(key: string): FrameResult | null {
    const frame = this.frames.get(key);
    if (!frame) return null;
    this.frames.delete(key);
    this.frames.set(key, frame);
    return frame;
  }

  set(key: string, frame: FrameResult): void {
    if (this.frames.has(key)) this.frames.delete(key);
    this.frames.set(key, frame);
    while (this.frames.size > this.maxEntries) {
      const oldest = this.frames.keys().next().value as string | undefined;
      if (!oldest) break;
      this.frames.delete(oldest);
    }
  }
}

export function createAlignerFrameQueryAtoms(
  runtime: AppRuntime<AlignerPortService>,
): AlignerFrameQueryAtoms {
  const cache = new FrameCache(8);

  const loadFrameAtom = Atom.family((inputKey: string) => {
    const input = JSON.parse(inputKey) as LoadFrameInput;
    const cacheKey = frameCacheKey(input.source, input.request, input.contrast);
    return runtime
      .atom(
        Effect.gen(function* () {
          const cached = cache.get(cacheKey);
          if (cached) return cached;
          const port = yield* AlignerPortService;
          const frame = yield* port.loadFrame(input.source, input.request, input.contrast);
          const normalized = normalizeFrameContrast(frame);
          cache.set(cacheKey, normalized);
          return normalized;
        }),
      )
      .pipe(Atom.withReactivity([ReactivityKeys.loadFrame(inputKey)]));
  });

  return { loadFrameAtom };
}
