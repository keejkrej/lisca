#!/usr/bin/env node
/**
 * Open the real Studio web UI on a fixture workspace.
 *
 *   pnpm run dev:studio-mock
 *   pnpm run dev:studio-mock -- --assay killing-death-reporter --stage cropped
 *
 * This is not a demo app. It materializes `@lisca/fixtures` into `.mock/studio`,
 * starts studio-server, and starts `@lisca/studio-web` with Vite `--mode mock`,
 * which loads that assay once the server answers. `dev:studio` does not do this.
 */
import { type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runSync, spawnInherit } from "./node-run.ts";

const require = createRequire(import.meta.url);
const { LISCA_APP_PORTS } = require("./lisca-dev-ports.cjs") as {
  LISCA_APP_PORTS: {
    studioMock: { publicPort: number; backendPort: number };
  };
};

/** Kept in lockstep with `@lisca/fixtures` by `scripts/dev-studio-mock.test.ts`. */
export const STUDIO_MOCK_ASSAYS = ["transfection", "killing-death-reporter"] as const;
/** `source` is an image folder, not a workspace, so the UI cannot open it. */
export const STUDIO_MOCK_STAGES = ["assay", "aligned", "cropped", "annotated", "analyzed"] as const;

export type StudioMockAssay = (typeof STUDIO_MOCK_ASSAYS)[number];
export type StudioMockStage = (typeof STUDIO_MOCK_STAGES)[number];

export type ParsedStudioMockArgs =
  | {
      ok: true;
      assay: StudioMockAssay;
      stage: StudioMockStage;
      out: string;
      force: boolean;
    }
  | { ok: false; help: boolean; error?: string };

const root = resolve(import.meta.dirname, "..");

export function defaultStudioMockOut(repoRoot: string): string {
  return resolve(repoRoot, ".mock/studio");
}

export function studioMockUsage(): string {
  return [
    "Open the real Studio web UI on a fixture workspace.",
    "",
    "Usage:",
    "  pnpm run dev:studio-mock [--assay <assay>] [--stage <stage>] [--out <dir>] [--force]",
    "",
    `Assays:  ${STUDIO_MOCK_ASSAYS.join(", ")}`,
    `Stages:  ${STUDIO_MOCK_STAGES.join(", ")}`,
    "",
    "Defaults: transfection, analyzed, .mock/studio (replaced each run).",
    "A custom --out is left alone unless you also pass --force.",
    "The source stage is not a workspace and cannot be opened.",
    "",
    `UI:      http://127.0.0.1:${LISCA_APP_PORTS.studioMock.publicPort}`,
    `Server:  127.0.0.1:${LISCA_APP_PORTS.studioMock.backendPort}`,
  ].join("\n");
}

function isAssay(value: string): value is StudioMockAssay {
  return (STUDIO_MOCK_ASSAYS as readonly string[]).includes(value);
}

function isStage(value: string): value is StudioMockStage {
  return (STUDIO_MOCK_STAGES as readonly string[]).includes(value);
}

export function parseStudioMockArgs(argv: string[], repoRoot: string): ParsedStudioMockArgs {
  let assay = "transfection";
  let stage = "analyzed";
  let out: string | undefined;
  let force = false;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg === "--") continue;
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
  if (stage === "source") {
    return {
      ok: false,
      help: false,
      error: "The source stage is an image folder, not a workspace. Use assay or a later stage.",
    };
  }
  if (!isAssay(assay)) {
    return {
      ok: false,
      help: false,
      error: `Unknown assay '${assay}'. Use ${STUDIO_MOCK_ASSAYS.join(" | ")}.`,
    };
  }
  if (!isStage(stage)) {
    return {
      ok: false,
      help: false,
      error: `Unknown stage '${stage}'. Use ${STUDIO_MOCK_STAGES.join(" | ")}.`,
    };
  }

  const resolvedOut = out ? resolve(out) : defaultStudioMockOut(repoRoot);
  return {
    ok: true,
    assay,
    stage,
    out: resolvedOut,
    force: force || out === undefined,
  };
}

function stopChildren(children: ChildProcess[], signal: NodeJS.Signals): void {
  for (const child of children) {
    if (child.exitCode === null && !child.signalCode) child.kill(signal);
  }
}

/** Materialize the fixture and start the server plus the mock-mode web UI. Returns a process exit code. */
export function startStudioMock(argv: string[], repoRoot = root): number {
  let parsed: ParsedStudioMockArgs;
  try {
    parsed = parseStudioMockArgs(argv, repoRoot);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(studioMockUsage());
    return 1;
  }
  if (!parsed.ok) {
    if (parsed.error) console.error(parsed.error);
    console.log(studioMockUsage());
    return parsed.help && !parsed.error ? 0 : 1;
  }

  const { publicPort, backendPort } = LISCA_APP_PORTS.studioMock;
  const assayJson = resolve(parsed.out, "assay.json");
  console.log(
    [
      `Studio browser mock (${parsed.assay}, ${parsed.stage})`,
      `Workspace  ${parsed.out}`,
      `UI         http://127.0.0.1:${publicPort}`,
      `Server     http://127.0.0.1:${backendPort}`,
      "Opens this fixture on Metadata once the server can read it.",
    ].join("\n"),
  );

  const fixtureArgs = [
    "--experimental-strip-types",
    resolve(repoRoot, "scripts/run-jiti.ts"),
    resolve(repoRoot, "packages/fixtures/src/cli.ts"),
    "--assay",
    parsed.assay,
    "--stage",
    parsed.stage,
    "--out",
    parsed.out,
  ];
  if (parsed.force) fixtureArgs.push("--force");
  runSync(process.execPath, fixtureArgs, { cwd: repoRoot });

  const killScript = resolve(repoRoot, "scripts/kill-tcp-listener.cjs");
  runSync(process.execPath, [killScript, String(publicPort)]);
  runSync(process.execPath, [killScript, String(backendPort)]);

  const children: ChildProcess[] = [];
  let stopping = false;
  const stop = (signal: NodeJS.Signals) => {
    if (stopping) return;
    stopping = true;
    stopChildren(children, signal);
  };
  const onChildExit = (code: number | null, signal: NodeJS.Signals | null) => {
    if (stopping) return;
    stop(signal ?? "SIGTERM");
    process.exit(code ?? (signal ? 0 : 1));
  };

  const vitePlusCli = fileURLToPath(import.meta.resolve("vite-plus/bin"));
  children.push(
    spawnInherit(
      "cargo",
      [
        "watch",
        "-w",
        ".",
        "-w",
        "../../aligner/server",
        "-w",
        "../../annotator/server",
        "-w",
        "../../../crates/lisca",
        "-w",
        "../../../Cargo.toml",
        "-w",
        "../../../Cargo.lock",
        "-x",
        "run -p studio-server",
      ],
      {
        cwd: resolve(repoRoot, "apps/studio/server"),
        env: { ...process.env, PORT: String(backendPort) },
      },
    ),
    spawnInherit(
      process.execPath,
      [vitePlusCli, "dev", "--mode", "mock", "--port", String(publicPort), "--strictPort"],
      {
        cwd: resolve(repoRoot, "apps/studio/web"),
        env: {
          ...process.env,
          VITE_LISCA_MOCK: "1",
          VITE_LISCA_MOCK_ASSAY: assayJson,
        },
      },
    ),
  );

  for (const child of children) {
    child.on("exit", onChildExit);
  }
  process.on("SIGINT", () => {
    stop("SIGINT");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stop("SIGTERM");
    process.exit(0);
  });
  return 0;
}

const invoked =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invoked) {
  const code = startStudioMock(process.argv.slice(2));
  if (code !== 0) process.exit(code);
}
