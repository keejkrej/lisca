import type { AlignerDataPort } from "./ports/types";
import type { AlignerSource, ContrastWindow, FrameRequest } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { normalizeFrameContrast } from "@lisca/utils";
import { Effect } from "effect";

import { ClientError } from "./infra/client-error";
import { toFetchErrorMessage } from "./infra/errors";

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

export function frameCacheKey(
  source: AlignerSource,
  selection: FrameRequest,
  contrast: ContrastWindow | null,
): string {
  return JSON.stringify([
    source,
    selection.pos,
    selection.channel,
    selection.time,
    selection.z,
    contrast?.min ?? "auto",
    contrast?.max ?? "auto",
  ]);
}

export type AlignerFrameLoaderOptions = {
  spanName: string;
  httpBaseUrl: () => string;
};

export function createAlignerFrameLoader(options: AlignerFrameLoaderOptions) {
  const cache = new FrameCache(8);

  function loadFrameEffect(
    backend: AlignerDataPort,
    source: AlignerSource,
    selection: FrameRequest,
    contrast: ContrastWindow | null,
  ) {
    const cacheKey = frameCacheKey(source, selection, contrast);
    const cached = cache.get(cacheKey);
    if (cached) return Effect.succeed(cached);

    return backend.loadFrame(source, selection, contrast).pipe(
      Effect.map(normalizeFrameContrast),
      Effect.tap((frame) => Effect.sync(() => cache.set(cacheKey, frame))),
      Effect.withSpan(options.spanName),
    );
  }

  function effectErrorMessage(error: unknown): string {
    const cause = error instanceof ClientError ? (error.cause ?? error) : error;
    return toFetchErrorMessage(cause, "Frame request failed", options.httpBaseUrl());
  }

  return { loadFrameEffect, effectErrorMessage };
}
