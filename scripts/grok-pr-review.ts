#!/usr/bin/env node
/**
 * Turn a Grok Build PR review into a published GitHub review.
 *
 * Usage:
 *   node --experimental-strip-types scripts/grok-pr-review.ts \
 *     --review grok.json --diff pr.diff --pr 12 --commit <sha> --repo owner/name
 *
 * CI also passes --fail-on bugs (default) so a correctness/security defect
 * fails the check. --dry-run prints the payload and skips the GitHub call.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type Severity = "bug" | "suggestion" | "nit";
export type Lens = "correctness" | "security" | "conventions";
export type FailOn = "bugs" | "none";

export interface ReviewIssue {
  severity: Severity;
  lens: Lens;
  file: string;
  line: number;
  description: string;
  suggestion: string;
}

export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
}

export interface ReviewComment {
  path: string;
  line: number;
  side: "RIGHT";
  body: string;
}

export interface ReviewPayload {
  commit_id: string;
  body: string;
  event: "COMMENT";
  comments: ReviewComment[];
}

export interface BuiltReview {
  payload: ReviewPayload;
  bugCount: number;
  suggestionCount: number;
  nitCount: number;
  inlineCount: number;
  bodyCount: number;
}

const SEVERITIES = new Set<Severity>(["bug", "suggestion", "nit"]);
const LENSES = new Set<Lens>(["correctness", "security", "conventions"]);
const SKIP_PATH =
  /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|Cargo\.lock|uv\.lock)$|\.(png|jpe?g|gif|webp|ico|onnx|woff2?)$/i;
const MAX_INLINE_COMMENTS = 40;

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function collectRightSideLines(diff: string): Map<string, Set<number>> {
  const files = new Map<string, Set<number>>();
  let path: string | undefined;
  let rightLine = 0;
  let inHunk = false;

  for (const rawLine of diff.split(/\n/)) {
    if (rawLine.startsWith("+++ ")) {
      const target = rawLine.slice(4).trim();
      path = plusPath(target);
      inHunk = false;
      continue;
    }
    if (path === undefined) {
      continue;
    }
    const hunk = HUNK_HEADER.exec(rawLine);
    if (hunk) {
      rightLine = Number(hunk[1]);
      inHunk = true;
      continue;
    }
    if (!inHunk) {
      continue;
    }
    if (rawLine.startsWith("\\")) {
      continue;
    }
    const prefix = rawLine[0];
    if (prefix === "+") {
      addRightLine(files, path, rightLine);
      rightLine += 1;
    } else if (prefix === " ") {
      addRightLine(files, path, rightLine);
      rightLine += 1;
    } else if (prefix === "-") {
      // Left-side only; do not advance the new-file cursor.
    } else {
      inHunk = false;
    }
  }

  return files;
}

function plusPath(target: string): string | undefined {
  if (target === "/dev/null") {
    return undefined;
  }
  const stripped = unquoteGitPath(target);
  return stripped.startsWith("b/") ? stripped.slice(2) : stripped;
}

const GIT_C_ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  '"': '"',
  "\\": "\\",
};

function unquoteGitPath(path: string): string {
  if (path.length >= 2 && path.startsWith('"') && path.endsWith('"')) {
    return path.slice(1, -1).replace(/\\([nt"\\])/g, (_, ch: string) => GIT_C_ESCAPES[ch] ?? ch);
  }
  return path;
}

function addRightLine(files: Map<string, Set<number>>, path: string, line: number): void {
  let lines = files.get(path);
  if (!lines) {
    lines = new Set();
    files.set(path, lines);
  }
  lines.add(line);
}

export function extractReview(raw: unknown): ReviewResult {
  const candidates = collectCandidates(raw);
  for (const candidate of candidates) {
    const parsed = asReview(candidate);
    if (parsed) {
      return parsed;
    }
  }
  throw new Error("Grok output did not contain a review object with summary and issues.");
}

function collectCandidates(raw: unknown): unknown[] {
  const out: unknown[] = [];
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    // Headless --output-format json uses camelCase; some streams use snake_case.
    if ("structuredOutput" in record) {
      out.push(record.structuredOutput);
    }
    if ("structured_output" in record) {
      out.push(record.structured_output);
    }
    out.push(raw);
    if (typeof record.text === "string") {
      out.push(...parseMaybeJsonObjects(record.text));
    }
  } else {
    out.push(raw);
  }
  if (typeof raw === "string") {
    out.push(...parseMaybeJsonObjects(raw));
  }
  return out;
}

function parseMaybeJsonObjects(text: string): unknown[] {
  const trimmed = stripFence(text.trim());
  try {
    return [JSON.parse(trimmed)];
  } catch {
    const objects: unknown[] = [];
    let i = 0;
    while (i < trimmed.length) {
      const start = trimmed.indexOf("{", i);
      if (start < 0) {
        break;
      }
      const end = matchingBrace(trimmed, start);
      if (end < 0) {
        break;
      }
      try {
        objects.push(JSON.parse(trimmed.slice(start, end + 1)) as unknown);
      } catch {
        // Skip malformed slices and continue scanning.
      }
      i = end + 1;
    }
    return objects.length > 0 ? objects.reverse() : [text];
  }
}

function matchingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function stripFence(text: string): string {
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  return match?.[1] ?? text;
}

function asReview(value: unknown): ReviewResult | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.summary !== "string" || !Array.isArray(record.issues)) {
    return undefined;
  }
  const issues: ReviewIssue[] = [];
  for (const item of record.issues) {
    const issue = asIssue(item);
    if (issue && !SKIP_PATH.test(issue.file)) {
      issues.push(issue);
    }
  }
  return { summary: record.summary.trim(), issues };
}

function asIssue(value: unknown): ReviewIssue | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const severity = record.severity;
  const lens = record.lens;
  const file =
    typeof record.file === "string" ? record.file.replace(/\\/g, "/").replace(/^\.\//, "") : "";
  const line = Number(record.line);
  const description = typeof record.description === "string" ? record.description.trim() : "";
  if (
    !isSeverity(severity) ||
    !isLens(lens) ||
    !file ||
    !Number.isInteger(line) ||
    line < 1 ||
    !description
  ) {
    return undefined;
  }
  return {
    severity,
    lens,
    file,
    line,
    description,
    suggestion: typeof record.suggestion === "string" ? record.suggestion.trim() : "",
  };
}

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && SEVERITIES.has(value as Severity);
}

function isLens(value: unknown): value is Lens {
  return typeof value === "string" && LENSES.has(value as Lens);
}

export function buildReview(args: {
  review: ReviewResult;
  diff: string;
  commit: string;
}): BuiltReview {
  const rightSide = collectRightSideLines(args.diff);
  const inline: ReviewIssue[] = [];
  const promoted: ReviewIssue[] = [];

  for (const issue of args.review.issues) {
    if (rightSide.get(issue.file)?.has(issue.line)) {
      inline.push(issue);
    } else {
      promoted.push(issue);
    }
  }

  const comments = inline.slice(0, MAX_INLINE_COMMENTS).map((issue) => ({
    path: issue.file,
    line: issue.line,
    side: "RIGHT" as const,
    body: commentBody(issue),
  }));
  const overflow = inline.slice(MAX_INLINE_COMMENTS);
  const bodyIssues = [...promoted, ...overflow];

  const bugCount = countSeverity(args.review.issues, "bug");
  const suggestionCount = countSeverity(args.review.issues, "suggestion");
  const nitCount = countSeverity(args.review.issues, "nit");

  return {
    payload: {
      commit_id: args.commit,
      event: "COMMENT",
      comments,
      body: reviewBody({
        summary: args.review.summary,
        bugCount,
        suggestionCount,
        nitCount,
        bodyIssues,
        truncatedInline: overflow.length,
      }),
    },
    bugCount,
    suggestionCount,
    nitCount,
    inlineCount: comments.length,
    bodyCount: bodyIssues.length,
  };
}

function countSeverity(issues: ReviewIssue[], severity: Severity): number {
  return issues.filter((issue) => issue.severity === severity).length;
}

function commentBody(issue: ReviewIssue): string {
  const suggestion = issue.suggestion ? `\n\n**Suggestion:** ${issue.suggestion}` : "";
  return `**[${issue.severity} · ${issue.lens}]** ${issue.description}${suggestion}`;
}

function reviewBody(args: {
  summary: string;
  bugCount: number;
  suggestionCount: number;
  nitCount: number;
  bodyIssues: ReviewIssue[];
  truncatedInline: number;
}): string {
  const lines = [
    "## Grok Build review",
    "",
    args.summary || "No summary provided.",
    "",
    "Lenses: correctness, security, conventions. Automated CI; not a human approval.",
    "",
    "## Issue counts",
    "",
    `- bugs: ${args.bugCount}`,
    `- suggestions: ${args.suggestionCount}`,
    `- nits: ${args.nitCount}`,
  ];

  if (args.bodyIssues.length > 0) {
    lines.push("", "## Issues outside the diff (or beyond the inline cap)", "");
    for (const issue of args.bodyIssues) {
      lines.push(
        `- **[${issue.severity} · ${issue.lens}]** ${issue.file}:${issue.line} — ${issue.description}`,
      );
      if (issue.suggestion) {
        lines.push(`  - **Suggestion:** ${issue.suggestion}`);
      }
    }
  }

  if (args.truncatedInline > 0) {
    lines.push(
      "",
      `${args.truncatedInline} additional inline finding(s) were folded into the body to stay under GitHub's review size limits.`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export function parseFailOn(value: string | undefined): FailOn {
  if (value === undefined || value === "" || value === "bugs") {
    return "bugs";
  }
  if (value === "none") {
    return "none";
  }
  throw new Error(`--fail-on must be "bugs" or "none"; received "${value}".`);
}

export function shouldFailCheck(failOn: FailOn, bugCount: number): boolean {
  return failOn === "bugs" && bugCount > 0;
}

interface CliArgs {
  reviewPath: string;
  diffPath: string;
  pr: string;
  commit: string;
  repo: string;
  failOn: FailOn;
  dryRun: boolean;
  payloadPath?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> & { dryRun: boolean } = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = (): string => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Flag ${token} requires a value.`);
      }
      i += 1;
      return value;
    };
    switch (token) {
      case "--review":
        args.reviewPath = next();
        break;
      case "--diff":
        args.diffPath = next();
        break;
      case "--pr":
        args.pr = next();
        break;
      case "--commit":
        args.commit = next();
        break;
      case "--repo":
        args.repo = next();
        break;
      case "--fail-on":
        args.failOn = parseFailOn(next());
        break;
      case "--payload":
        args.payloadPath = next();
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  const reviewPath = args.reviewPath;
  const diffPath = args.diffPath;
  const pr = args.pr ?? process.env.GROK_REVIEW_PR;
  const commit = args.commit ?? process.env.GROK_REVIEW_COMMIT;
  const repo = args.repo ?? process.env.GITHUB_REPOSITORY;
  if (!reviewPath || !diffPath || !pr || !commit || !repo) {
    throw new Error(
      "Required: --review, --diff, --pr, --commit, --repo (or GROK_REVIEW_PR, GROK_REVIEW_COMMIT, GITHUB_REPOSITORY).",
    );
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error(`Invalid --repo value: ${repo}`);
  }
  if (!/^\d+$/.test(pr)) {
    throw new Error(`Invalid --pr value: ${pr}`);
  }
  return {
    reviewPath,
    diffPath,
    pr,
    commit,
    repo,
    failOn: args.failOn ?? parseFailOn(process.env.GROK_REVIEW_FAIL_ON),
    dryRun: args.dryRun,
    payloadPath: args.payloadPath,
  };
}

function readJson(path: string): unknown {
  const text = readFileSync(path, "utf8");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function postReview(repo: string, pr: string, payloadPath: string): { id?: number } {
  const result = spawnSync(
    "gh",
    ["api", `repos/${repo}/pulls/${pr}/reviews`, "-X", "POST", "--input", payloadPath],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    const stderr = (result.stderr || result.stdout || "").trim();
    throw new Error(`GitHub review post failed (exit ${result.status ?? "unknown"}):\n${stderr}`);
  }
  try {
    return JSON.parse(result.stdout) as { id?: number };
  } catch {
    return {};
  }
}

function main(argv: string[]): number {
  const args = parseArgs(argv);
  const review = extractReview(readJson(resolve(args.reviewPath)));
  const diff = readFileSync(resolve(args.diffPath), "utf8");
  const built = buildReview({ review, diff, commit: args.commit });
  const payloadPath = resolve(args.payloadPath ?? "grok-review-payload.json");
  writeFileSync(payloadPath, `${JSON.stringify(built.payload, null, 2)}\n`);

  console.log(
    `Prepared review: ${built.bugCount} bugs, ${built.suggestionCount} suggestions, ${built.nitCount} nits; ${built.inlineCount} inline, ${built.bodyCount} body.`,
  );

  if (args.dryRun) {
    console.log(`Dry run; payload written to ${payloadPath}`);
  } else {
    const posted = postReview(args.repo, args.pr, payloadPath);
    console.log(
      posted.id
        ? `Posted COMMENT review ${posted.id} on ${args.repo}#${args.pr}.`
        : `Posted COMMENT review on ${args.repo}#${args.pr}.`,
    );
  }

  if (shouldFailCheck(args.failOn, built.bugCount)) {
    console.error(`Failing the check: ${built.bugCount} bug-severity issue(s).`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
