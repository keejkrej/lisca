import { Context, Layer } from "effect";

import type { AlignerDataPort, AnnotatorDataPort, StudioDataPort } from "../ports/types";

export class AlignerPortService extends Context.Tag("@lisca/AlignerPort")<
  AlignerPortService,
  AlignerDataPort
>() {}

export class AnnotatorPortService extends Context.Tag("@lisca/AnnotatorPort")<
  AnnotatorPortService,
  AnnotatorDataPort
>() {}

export class StudioPortService extends Context.Tag("@lisca/StudioPort")<
  StudioPortService,
  StudioDataPort
>() {}

export function alignerPortLayer(port: AlignerDataPort) {
  return Layer.succeed(AlignerPortService, port);
}

export function annotatorPortLayer(port: AnnotatorDataPort) {
  return Layer.succeed(AnnotatorPortService, port);
}

export function studioPortLayer(port: StudioDataPort) {
  return Layer.succeed(StudioPortService, port);
}
