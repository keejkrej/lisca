import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import {
  FIXTURE_ASSAYS,
  FIXTURE_STAGES,
  isFixtureAssay,
  isFixtureStage,
  materializeFixture,
  type FixtureAssay,
  type FixtureStage,
} from "./materialize";

export type ParsedFixtureArgs =
  | { ok: true; assay: FixtureAssay; stage: FixtureStage; out: string; force: boolean }
  | { ok: false; help: boolean; error?: string };

export function parseFixtureArgs(argv: string[]): ParsedFixtureArgs {
  let assay: string | undefined;
  let stage: string | undefined;
  let out: string | undefined;
  let force = false;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--force" || arg === "-f") {
      force = true;
      continue;
    }
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const inline = eq === -1 ? undefined : arg.slice(eq + 1);
    const take = (): string => {
      if (inline !== undefined) return inline;
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) throw new Error(`Missing value for ${name}`);
      i += 1;
      return next;
    };
    if (name === "--assay" || name === "-a") {
      assay = take();
      continue;
    }
    if (name === "--stage" || name === "-s") {
      stage = take();
      continue;
    }
    if (name === "--out" || name === "-o") {
      out = take();
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }

  if (help) return { ok: false, help: true };
  if (!assay || !stage || !out) {
    return {
      ok: false,
      help: true,
      error: "Required: --assay, --stage, and --out.",
    };
  }
  if (!isFixtureAssay(assay)) {
    return {
      ok: false,
      help: false,
      error: `Unknown assay '${assay}'. Use ${FIXTURE_ASSAYS.join(" | ")}.`,
    };
  }
  if (!isFixtureStage(stage)) {
    return {
      ok: false,
      help: false,
      error: `Unknown stage '${stage}'. Use ${FIXTURE_STAGES.join(" | ")}.`,
    };
  }
  return { ok: true, assay, stage, out, force };
}

export function fixtureUsage(): string {
  return [
    "Materialize a sample LISCA image source or half-finished workspace.",
    "",
    "Usage:",
    "  vp run fixture:workspace -- --assay <transfection|killing> --stage <stage> --out <dir> [--force]",
    "",
    `Assays:  ${FIXTURE_ASSAYS.join(", ")}`,
    `Stages:  ${FIXTURE_STAGES.join(", ")}`,
    "",
    "Stages are cumulative workspace snapshots (except source, which is a folder only):",
    "  source     templated image folder, no workspace",
    "  assay      workspace + valid assay.json + source/ (no alignment)",
    "  aligned    + bbox/PosN.csv and align/PosN.json",
    "  cropped    + roi/PosN/ stacks and index.json",
    "  annotated  + annotations/labels.json and one frame annotation per ROI",
    "  analyzed   + timeseries/PosN/chN.csv and results/*.{csv,png}",
    "",
    "Examples:",
    "  # Only test align (source + assay.json, no boxes yet)",
    "  vp run fixture:workspace -- --assay transfection --stage assay --out /tmp/tf-align",
    "",
    "  # Only test crop (alignment already saved)",
    "  vp run fixture:workspace -- --assay killing --stage aligned --out /tmp/kill-crop",
    "",
    "  # Only test analysis (ROI stacks present, no results yet)",
    "  vp run fixture:workspace -- --assay transfection --stage cropped --out /tmp/tf-analyze",
    "",
    "  # Open a finished workspace / review Rust PNG filenames",
    "  vp run fixture:workspace -- --assay killing --stage analyzed --out /tmp/kill-done",
  ].join("\n");
}

export function runFixtureCli(
  argv: string[],
  io: { log: (msg: string) => void; error: (msg: string) => void } = console,
): number {
  let parsed: ParsedFixtureArgs;
  try {
    parsed = parseFixtureArgs(argv);
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    io.error(fixtureUsage());
    return 1;
  }
  if (!parsed.ok) {
    if (parsed.error) io.error(parsed.error);
    io.log(fixtureUsage());
    return parsed.help && !parsed.error ? 0 : 1;
  }
  const result = materializeFixture(parsed);
  io.log(
    `Wrote ${result.assay} ${result.stage} fixture to ${result.out} (${result.files.length} files).`,
  );
  return 0;
}

const invoked =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invoked) {
  process.exitCode = runFixtureCli(process.argv.slice(2));
}
