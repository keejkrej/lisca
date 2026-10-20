import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { imageBlock, prettyJson, textBlock } from "./content.ts";
import { isPng } from "./images.ts";
import { errorFrom, jsonResult, type LiscaTool } from "./tool.ts";

const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PLOT_BYTES = 16 * 1024 * 1024;
const MAX_CSV_ROWS = 2_000;

export function workspaceLiscaTools(): LiscaTool[] {
  return [
    {
      name: "workspace_overview",
      title: "Workspace overview",
      description:
        "Summarize a LiSCA workspace folder on disk, no server needed: the assay.json assay type and Image source, " +
        "which pipeline stages are present (aligned Positions, cropped ROI stacks, annotations, analysis, results), " +
        "counts per Position, and the plot files ready for viewing. Use workspace_read_plot for the figures.",
      inputSchema: {
        type: "object",
        properties: {
          workspacePath: { type: "string", description: "Path to the workspace folder." },
        },
        required: ["workspacePath"],
      },
      handler: async (args) => {
        try {
          return jsonResult(overview(String(args.workspacePath ?? "")));
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
    {
      name: "workspace_read_file",
      title: "Read a workspace file",
      description:
        "Read one file from a workspace as structured text, no server needed: JSON is pretty-printed, CSV/TSV is " +
        "parsed into columns and rows (capped), everything else comes back raw. For the results figures use " +
        "workspace_read_plot instead.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to read (absolute, or inside the workspace).",
          },
          workspacePath: {
            type: "string",
            description: "Optional workspace folder; when set, `path` may be workspace-relative.",
          },
          maxRows: {
            type: "integer",
            minimum: 1,
            description: `Row cap for CSV/TSV reads. Default ${MAX_CSV_ROWS}.`,
          },
        },
        required: ["path"],
      },
      handler: async (args) => {
        try {
          const filePath = resolveWithin(String(args.path ?? ""), args.workspacePath);
          const maxRows =
            Number.isFinite(Number(args.maxRows)) && Number(args.maxRows) > 0
              ? Number(args.maxRows)
              : MAX_CSV_ROWS;
          const stat = requireFile(filePath);
          if (stat.size > MAX_TEXT_FILE_BYTES) {
            throw new Error(
              `${filePath} is ${stat.size} bytes; workspace_read_file caps text reads at ${MAX_TEXT_FILE_BYTES}.`,
            );
          }
          const text = readFileSync(filePath, "utf8");
          const extension = path.extname(filePath).toLowerCase();
          if (extension === ".json") {
            return jsonResult({
              path: filePath,
              kind: "json",
              parsed: JSON.parse(text.length > 0 ? text : "null"),
            });
          }
          if (extension === ".csv" || extension === ".tsv") {
            return jsonResult(
              readDelimited(filePath, text, extension === ".tsv" ? "\t" : ",", maxRows),
            );
          }
          return jsonResult({ path: filePath, kind: "text", text });
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
    {
      name: "workspace_read_plot",
      title: "View a results figure",
      description:
        "Read a PNG figure from a workspace's results/ folder (traces, AUC boxplot, fit, engagement summaries…) " +
        "and return it as an image you can view. List available figures first with workspace_overview.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "PNG path (absolute, or inside the workspace)." },
          workspacePath: {
            type: "string",
            description: "Optional workspace folder; when set, `path` may be workspace-relative.",
          },
        },
        required: ["path"],
      },
      handler: async (args) => {
        try {
          const filePath = resolveWithin(String(args.path ?? ""), args.workspacePath);
          const stat = requireFile(filePath);
          if (stat.size > MAX_PLOT_BYTES) {
            throw new Error(
              `${filePath} is ${stat.size} bytes; workspace_read_plot caps at ${MAX_PLOT_BYTES}.`,
            );
          }
          const png = readFileSync(filePath);
          if (!isPng(png)) {
            throw new Error(`${filePath} is not a PNG file.`);
          }
          return {
            content: [
              imageBlock(png),
              textBlock(prettyJson({ path: filePath, bytes: png.length, image: "attached above" })),
            ],
          };
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
  ];
}

function resolveWithin(relative: string, workspacePath: unknown): string {
  if (typeof workspacePath === "string" && workspacePath.length > 0 && !path.isAbsolute(relative)) {
    return path.resolve(workspacePath, relative);
  }
  return path.resolve(relative);
}

function requireFile(filePath: string) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error(`No file at ${filePath}.`);
  }
  return statSync(filePath);
}

export interface WorkspaceOverview {
  workspacePath: string;
  exists: boolean;
  assayJson?: unknown;
  stages: {
    alignedPositions: number[];
    croppedPositions: number[];
    annotationLabels: number | null;
    annotatedFrames: number;
    analysisPositions: number[];
    resultPlots: { path: string; bytes: number }[];
  };
}

function overview(workspacePath: string): WorkspaceOverview {
  const resolved = path.resolve(workspacePath);
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    return { workspacePath: resolved, exists: false, stages: emptyStages() };
  }
  const assayJsonPath = path.join(resolved, "assay.json");
  let assayJson: unknown;
  if (existsSync(assayJsonPath)) {
    try {
      assayJson = JSON.parse(readFileSync(assayJsonPath, "utf8"));
    } catch {
      assayJson = { error: "assay.json is not valid JSON" };
    }
  }
  const alignedPositions = positionDirs(resolved, "bbox");
  const croppedPositions = positionDirs(resolved, "roi");
  const labels = readLabelCount(resolved);
  const annotatedFrames = countFiles(path.join(resolved, "annotations", "roi"), ".json");
  const analysisPositions = positionDirs(resolved, "analysis");
  const resultPlots = listPngs(resolved, path.join(resolved, "results"));
  return {
    workspacePath: resolved,
    exists: true,
    assayJson,
    stages: {
      alignedPositions,
      croppedPositions,
      annotationLabels: labels,
      annotatedFrames,
      analysisPositions,
      resultPlots,
    },
  };
}

function emptyStages() {
  return {
    alignedPositions: [],
    croppedPositions: [],
    annotationLabels: null,
    annotatedFrames: 0,
    analysisPositions: [],
    resultPlots: [],
  };
}

/** Position numbers under a `Pos{n}` directory layout (bbox/Pos1, roi/Pos2, …). */
function positionDirs(root: string, folder: string): number[] {
  const dir = path.join(root, folder);
  if (!existsSync(dir)) {
    return [];
  }
  const positions: number[] = [];
  for (const entry of readdirSync(dir)) {
    const match = /^Pos(\d+)(?:\.|$)/.exec(entry);
    if (!match) {
      continue;
    }
    // bbox stores PosN as CSV files; roi/analysis as PosN folders.
    if (existsSync(path.join(dir, entry))) {
      positions.push(Number(match[1]));
    }
  }
  return positions.sort((a, b) => a - b);
}

function readLabelCount(root: string): number | null {
  const labelsPath = path.join(root, "annotations", "labels.json");
  if (!existsSync(labelsPath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(labelsPath, "utf8")) as { labels?: unknown[] };
    return Array.isArray(parsed.labels) ? parsed.labels.length : null;
  } catch {
    return null;
  }
}

function countFiles(root: string, extension: string): number {
  if (!existsSync(root)) {
    return 0;
  }
  let count = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.toLowerCase().endsWith(extension)) {
        count++;
      }
    }
  };
  walk(root);
  return count;
}

function listPngs(workspaceRoot: string, folder: string): { path: string; bytes: number }[] {
  if (!existsSync(folder)) {
    return [];
  }
  const plots: { path: string; bytes: number }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.toLowerCase().endsWith(".png")) {
        plots.push({ path: path.relative(workspaceRoot, full), bytes: statSync(full).size });
      }
    }
  };
  walk(folder);
  return plots.sort((a, b) => a.path.localeCompare(b.path));
}

/** Parse delimiter-separated text (RFC 4180 quotes) into columns and rows. */
export function readDelimited(
  filePath: string,
  text: string,
  delimiter: string,
  maxRows: number,
): {
  path: string;
  kind: "csv" | "tsv";
  columns: string[];
  rows: string[][];
  rowCount: number;
  truncated: boolean;
} {
  const rows = parseDelimited(text, delimiter);
  const [header, ...dataRows] = rows;
  const columns = header ?? [];
  return {
    path: filePath,
    kind: delimiter === "\t" ? "tsv" : "csv",
    columns,
    rows: dataRows.slice(0, maxRows),
    rowCount: dataRows.length,
    truncated: dataRows.length > maxRows,
  };
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
