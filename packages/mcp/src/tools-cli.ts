import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { repoRoot, targetBinary } from "./config.ts";
import { errorFrom, errorResult, type LiscaTool } from "./tool.ts";

const DEFAULT_CLI_TIMEOUT_MS = 10 * 60_000;
const OUTPUT_CAP_CHARS = 60_000;

export interface CommandResult {
  command: string;
  argv: string[];
  cwd: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
}

/** Run a local command, capture output, and kill it on timeout. */
export function runCommand(
  argv: string[],
  options: { cwd: string; timeoutMs: number },
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(argv[0], argv.slice(1), { cwd: options.cwd });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      if (stdout.length < OUTPUT_CAP_CHARS) {
        stdout += chunk;
      }
    });
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < OUTPUT_CAP_CHARS) {
        stderr += chunk;
      }
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
    }, options.timeoutMs);
    child.on("error", (cause) => {
      clearTimeout(timer);
      resolve({
        command: argv[0],
        argv,
        cwd: options.cwd,
        exitCode: null,
        timedOut,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr: `${stderr}${stderr ? "\n" : ""}spawn error: ${cause.message}`,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        command: argv[0],
        argv,
        cwd: options.cwd,
        exitCode: code,
        timedOut,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

/** Resolve a cargo target binary, preferring release over debug builds. */
export function resolveCliBinary(name: string): string | null {
  for (const release of [true, false]) {
    const binary = targetBinary(name, release);
    if (existsSync(binary)) {
      return binary;
    }
  }
  return null;
}

export function commandResult(result: CommandResult) {
  const content = [
    `$ ${result.argv.map(quote).join(" ")} (in ${result.cwd})`,
    result.exitCode === null ? "spawn failed" : `exit code ${result.exitCode}`,
    `duration ${(result.durationMs / 1000).toFixed(1)}s${result.timedOut ? " (TIMED OUT, killed)" : ""}`,
    result.stdout.trim() ? `\nstdout:\n${result.stdout.trim()}` : "",
    result.stderr.trim() ? `\nstderr:\n${result.stderr.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    content: [{ type: "text" as const, text: content }],
    isError: result.exitCode !== 0,
  };
}

function quote(token: string): string {
  return /[\s"]/.test(token) ? JSON.stringify(token) : token;
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stringArg(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function optionalStringList(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error("expected an array of strings");
  }
  return value as string[];
}

export function cliLiscaTools(): LiscaTool[] {
  return [
    {
      name: "cli_analyze",
      title: "Run the assay analysis CLI",
      description:
        "Run lisca-analyze on a workspace: transfection stages (segment, traces, auc, fit, plot-*, or `pipeline` " +
        "for all of them), the killing assays (killing-death-reporter, killing-engagement), and lnp-binding. Killing and " +
        "lnp-binding require a matching assay.json type. Prefer this over studio_start_analysis when you want the CLI's own stage " +
        "flags (extraArgs) or to run analysis without a server. Writes masks to mask/, tables to analysis/, " +
        "and figures to results/.",
      inputSchema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            enum: [
              "pipeline",
              "analyze",
              "all",
              "segment",
              "traces",
              "auc",
              "fit",
              "plot-traces",
              "plot-auc",
              "plot-fit",
              "killing-death-reporter",
              "killing-engagement",
              "lnp-binding",
            ],
            description:
              "Which assay command to run. `pipeline`/`analyze`/`all` run every transfection stage.",
          },
          workspace: {
            type: "string",
            description: "Workspace path with assay.json (the crop/annotate layout).",
          },
          extraArgs: {
            type: "array",
            items: { type: "string" },
            description:
              'Extra CLI flags, e.g. ["--interval", "30", "--backend", "onnx", "--force"]. See lisca-analyze --help.',
          },
          build: {
            type: "boolean",
            description:
              "Run through `cargo run --release` when no lisca-analyze binary exists yet, instead of failing. Default false.",
          },
          timeoutMs: {
            type: "integer",
            minimum: 1000,
            description: `Default ${DEFAULT_CLI_TIMEOUT_MS}.`,
          },
        },
        required: ["command", "workspace"],
      },
      handler: async (args) => {
        try {
          const workspace = path.resolve(stringArg(args.workspace, "workspace"));
          const command = stringArg(args.command, "command");
          const extra = optionalStringList(args.extraArgs);
          let argv: string[];
          const binary = resolveCliBinary("lisca-analyze");
          if (binary) {
            argv = [binary, command, ...extra, workspace];
          } else if (args.build) {
            argv = [
              "cargo",
              "run",
              "--release",
              "-p",
              "lisca",
              "--bin",
              "lisca-analyze",
              "--",
              command,
              ...extra,
              workspace,
            ];
          } else {
            return errorResult(
              "No lisca-analyze binary under target/release or target/debug. " +
                "Pass build=true to run it via cargo (first run compiles), or build it yourself.",
            );
          }
          const result = await runCommand(argv, {
            cwd: repoRoot(),
            timeoutMs: positiveInt(args.timeoutMs, DEFAULT_CLI_TIMEOUT_MS),
          });
          return commandResult(result);
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
    {
      name: "cli_crop",
      title: "Run the ROI crop CLI",
      description:
        "Crop ROI image stacks from an Image source into a workspace's roi/ folder: per-ROI TIFF stacks plus " +
        "index.json, preserving Position and ROI identity. Rust lisca-crop (default) or the Python crop " +
        "(implementation=python, needs uv). Requires saved ROI boxes (bbox/Pos{n}.csv) — save alignment first " +
        "with align_save_bbox or align_crop_roi.",
      inputSchema: {
        type: "object",
        properties: {
          workspace: { type: "string", description: "Workspace path holding bbox/Pos{n}.csv." },
          source: {
            type: "string",
            description: "Image source: ND2 or CZI file, or a folder of frames.",
          },
          positions: {
            type: "string",
            description:
              'Comma-separated position numbers, e.g. "0,1,2". Omit to crop every saved Position.',
          },
          implementation: {
            type: "string",
            enum: ["rust", "python"],
            description: "rust (lisca-crop binary) or python (uv run lisca crop). Default rust.",
          },
          overwrite: {
            type: "boolean",
            description: "Overwrite existing ROI stacks. Default false.",
          },
          workers: {
            type: "integer",
            minimum: 1,
            description: "Parallel workers (Python implementation).",
          },
          timeoutMs: {
            type: "integer",
            minimum: 1000,
            description: `Default ${DEFAULT_CLI_TIMEOUT_MS}.`,
          },
        },
        required: ["workspace", "source"],
      },
      handler: async (args) => {
        try {
          const workspace = path.resolve(stringArg(args.workspace, "workspace"));
          const source = path.resolve(stringArg(args.source, "source"));
          const common = ["--workspace", workspace, "--source", source];
          if (args.positions !== undefined) {
            common.push("--positions", stringArg(args.positions, "positions"));
          }
          if (args.overwrite === true) {
            common.push("--overwrite");
          }
          const implementation = args.implementation === "python" ? "python" : "rust";
          let argv: string[];
          if (implementation === "rust") {
            const binary = resolveCliBinary("lisca-crop");
            if (binary) {
              argv = [binary, ...common];
            } else {
              argv = [
                "cargo",
                "run",
                "-p",
                "lisca",
                "--bin",
                "lisca-crop",
                "--no-default-features",
                "--",
                ...common,
              ];
            }
          } else {
            const extra =
              args.workers === undefined ? [] : ["--workers", String(positiveInt(args.workers, 1))];
            argv = ["uv", "run", "lisca", "crop", ...common, ...extra];
          }
          const result = await runCommand(argv, {
            cwd: implementation === "python" ? path.join(repoRoot(), "python") : repoRoot(),
            timeoutMs: positiveInt(args.timeoutMs, DEFAULT_CLI_TIMEOUT_MS),
          });
          return commandResult(result);
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
    {
      name: "cli_fixture_workspace",
      title: "Materialize a workspace fixture",
      description:
        "Materialize a real workspace fixture for a given assay and pipeline stage (source, assay, aligned, " +
        "cropped, annotated, or analyzed) into an output folder. The fixture is a genuine workspace — scan it " +
        "with align_scan_source or annotate_scan_roi_workspace, analyze it with cli_analyze — so you can " +
        "exercise the whole product line without a microscope acquisition. Use force to overwrite an existing folder.",
      inputSchema: {
        type: "object",
        properties: {
          assay: {
            type: "string",
            enum: ["transfection", "killing-death-reporter"],
            description: "Which assay's fixture layout to materialize.",
          },
          stage: {
            type: "string",
            enum: ["source", "assay", "aligned", "cropped", "annotated", "analyzed"],
            description: "Pipeline stage to materialize up to.",
          },
          out: { type: "string", description: "Output workspace folder path." },
          force: { type: "boolean", description: "Overwrite an existing folder. Default false." },
          timeoutMs: { type: "integer", minimum: 1000, description: "Default 300000." },
        },
        required: ["assay", "stage", "out"],
      },
      handler: async (args) => {
        try {
          const assay = stringArg(args.assay, "assay");
          const stage = stringArg(args.stage, "stage");
          const out = path.resolve(stringArg(args.out, "out"));
          const flags = ["--assay", assay, "--stage", stage, "--out", out];
          if (args.force === true) {
            flags.push("--force");
          }
          const result = await runCommand(["pnpm", "run", "fixture:workspace", "--", ...flags], {
            cwd: repoRoot(),
            timeoutMs: positiveInt(args.timeoutMs, 300_000),
          });
          const report = { ...result, out, existsNow: existsSync(out) };
          const content = commandResult(report);
          if (result.exitCode === 0 && !report.existsNow) {
            return {
              content: [
                {
                  type: "text",
                  text: `${content.content[0].text}\nWarning: output folder does not exist at ${out}.`,
                },
              ],
              isError: true,
            };
          }
          return content;
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
  ];
}
