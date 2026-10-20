import { callProductApi } from "./http.ts";
import { prettyJson } from "./content.ts";
import { errorFrom, type LiscaTool } from "./tool.ts";
import type { ProductId } from "./config.ts";
import { sleep } from "./tools-servers.ts";

const DEFAULT_WAIT_TIMEOUT_MS = 10 * 60_000;
const DEFAULT_POLL_MS = 1_500;

const TASK_TERMINAL = new Set(["completed", "failed", "cancelled"]);
const ANALYSIS_TERMINAL = new Set(["completed", "error"]);

interface TaskDetail {
  task?: { status?: string; steps?: { id?: string; name?: string; status?: string }[] };
}

interface AnalysisProgress {
  status?: string;
}

export function waitLiscaTools(): LiscaTool[] {
  return [
    {
      name: "task_wait",
      title: "Wait for a background task",
      description:
        "Poll a background task (ROI crop, analysis run) by taskId until it reaches a terminal status " +
        "(completed, failed, cancelled) and return the final task detail. Returns the current snapshot when " +
        "the timeout elapses — call again to keep waiting. Use tasks_list_tasks to find taskIds.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "Task id from tasks_list_tasks or a start tool." },
          product: {
            type: "string",
            enum: ["annotator", "studio"],
            description: "Server owning the task. Default studio.",
          },
          timeoutMs: {
            type: "integer",
            minimum: 1000,
            description: `Default ${DEFAULT_WAIT_TIMEOUT_MS}.`,
          },
          pollMs: { type: "integer", minimum: 100, description: `Default ${DEFAULT_POLL_MS}.` },
        },
        required: ["taskId"],
      },
      handler: async (args) => {
        try {
          const product: ProductId = args.product === "annotator" ? "annotator" : "studio";
          return await pollUntil(async () => {
            const detail = await callProductApi(product, "GET", "/tasks/task", {
              query: { taskId: args.taskId },
            });
            const status = (detail as TaskDetail)?.task?.status;
            return { done: typeof status === "string" && TASK_TERMINAL.has(status), value: detail };
          }, args);
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
    {
      name: "analysis_wait",
      title: "Wait for an analysis run",
      description:
        "Poll an Analysis run (transfection pipeline or killing assay) until it completes or errors, then return " +
        "the final progress with its result files. Track it by requestId from studio_start_analysis, or by " +
        "workspacePath to follow the latest run. Use studio_get_analysis_results for the CSV contents.",
      inputSchema: {
        type: "object",
        properties: {
          requestId: {
            type: "string",
            description: "Analysis requestId from studio_start_analysis.",
          },
          workspacePath: {
            type: "string",
            description: "Workspace path — follows its latest run when requestId is not given.",
          },
          timeoutMs: {
            type: "integer",
            minimum: 1000,
            description: `Default ${DEFAULT_WAIT_TIMEOUT_MS}.`,
          },
          pollMs: { type: "integer", minimum: 100, description: `Default ${DEFAULT_POLL_MS}.` },
        },
      },
      handler: async (args) => {
        try {
          if (typeof args.requestId !== "string" && typeof args.workspacePath !== "string") {
            throw new Error("Give requestId or workspacePath.");
          }
          return await pollUntil(async () => {
            const byRequest = typeof args.requestId === "string";
            const progress = byRequest
              ? await callProductApi("studio", "GET", "/studio/analysis-progress", {
                  query: { requestId: args.requestId },
                })
              : await callProductApi("studio", "GET", "/studio/latest-analysis", {
                  query: { workspacePath: args.workspacePath },
                });
            if (progress === null || progress === undefined) {
              return { done: true, value: { status: "none", note: "No analysis run found." } };
            }
            const status = (progress as AnalysisProgress)?.status;
            return {
              done: typeof status === "string" && ANALYSIS_TERMINAL.has(status),
              value: progress,
            };
          }, args);
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
    {
      name: "crop_wait",
      title: "Wait for an ROI crop",
      description:
        "Poll an ROI crop run by requestId until it completes, is cancelled, or errors, then return the final " +
        "progress (positions and ROIs done). Follows the crop started by align_crop_roi on the Studio server.",
      inputSchema: {
        type: "object",
        properties: {
          requestId: { type: "string", description: "Crop requestId from align_crop_roi." },
          timeoutMs: {
            type: "integer",
            minimum: 1000,
            description: `Default ${DEFAULT_WAIT_TIMEOUT_MS}.`,
          },
          pollMs: { type: "integer", minimum: 100, description: `Default ${DEFAULT_POLL_MS}.` },
        },
        required: ["requestId"],
      },
      handler: async (args) => {
        try {
          return await pollUntil(async () => {
            const progress = await callProductApi("studio", "GET", "/align/crop-roi-progress", {
              query: { requestId: args.requestId },
            });
            if (progress === null || progress === undefined) {
              return {
                done: true,
                value: { status: "none", note: "No crop progress found for requestId." },
              };
            }
            const status = (progress as AnalysisProgress)?.status;
            return {
              done: typeof status === "string" && TASK_TERMINAL.has(status),
              value: progress,
            };
          }, args);
        } catch (cause) {
          return errorFrom(cause);
        }
      },
    },
  ];
}

async function pollUntil(
  step: () => Promise<{ done: boolean; value: unknown }>,
  args: Record<string, unknown>,
) {
  const timeoutMs = positiveInt(args.timeoutMs, DEFAULT_WAIT_TIMEOUT_MS);
  const pollMs = positiveInt(args.pollMs, DEFAULT_POLL_MS);
  const deadline = Date.now() + timeoutMs;
  let snapshot: unknown = null;
  let polls = 0;
  while (true) {
    polls++;
    const result = await step();
    snapshot = result.value;
    if (result.done) {
      return { content: [{ type: "text" as const, text: prettyJson(result.value) }] };
    }
    if (Date.now() + pollMs >= deadline) {
      break;
    }
    await sleep(pollMs);
  }
  return {
    content: [
      {
        type: "text" as const,
        text:
          `TIMED OUT after ${(timeoutMs / 1000).toFixed(0)}s and ${polls} polls; the run is still in ` +
          `progress. Current snapshot (call again to keep waiting):\n\n${prettyJson(snapshot)}`,
      },
    ],
  };
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
