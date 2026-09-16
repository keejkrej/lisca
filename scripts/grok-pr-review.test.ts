import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildReview,
  collectRightSideLines,
  extractReview,
  parseFailOn,
  shouldFailCheck,
} from "./grok-pr-review.ts";

const sampleDiff = `diff --git a/packages/utils/src/foo.ts b/packages/utils/src/foo.ts
index 111..222 100644
--- a/packages/utils/src/foo.ts
+++ b/packages/utils/src/foo.ts
@@ -10,7 +10,8 @@ export function load(path: string) {
   const text = read(path)
-  return JSON.parse(text)
+  if (!text) throw new Error("empty")
+  return JSON.parse(text)
 }
diff --git a/packages/ui/src/widget.tsx b/packages/ui/src/widget.tsx
new file mode 100644
index 000..333
--- /dev/null
+++ b/packages/ui/src/widget.tsx
@@ -0,0 +1,3 @@
+export function Widget() {
+  return fetch("/api")
+}
diff --git a/gone.ts b/gone.ts
deleted file mode 100644
index 444..000
--- a/gone.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export const gone = true
-export const leftover = 1
`;

describe("collectRightSideLines", () => {
  it("records added and context lines on the new-file side", () => {
    const lines = collectRightSideLines(sampleDiff);
    expect(lines.get("packages/utils/src/foo.ts")).toEqual(new Set([10, 11, 12, 13]));
    expect(lines.get("packages/ui/src/widget.tsx")).toEqual(new Set([1, 2, 3]));
    expect(lines.has("gone.ts")).toBe(false);
  });

  it("parses single-line hunks and function headers", () => {
    const diff = `--- a/a.ts
+++ b/a.ts
@@ -42 +42,2 @@ function run() {
   keep()
+  added()
`;
    expect(collectRightSideLines(diff).get("a.ts")).toEqual(new Set([42, 43]));
  });
});

describe("extractReview", () => {
  const valid = {
    summary: "Adds a fetch from UI.",
    issues: [
      {
        severity: "bug",
        lens: "conventions",
        file: "packages/ui/src/widget.tsx",
        line: 2,
        description: "UI calls fetch directly.",
        suggestion: "Move the request into @lisca/client.",
      },
    ],
  };

  it("reads structured_output from a grok json envelope", () => {
    expect(extractReview({ text: "ignored", structured_output: valid })).toEqual(valid);
  });

  it("parses fenced JSON in the text field", () => {
    expect(extractReview({ text: `\`\`\`json\n${JSON.stringify(valid)}\n\`\`\`` })).toEqual(valid);
  });

  it("drops lockfile findings", () => {
    const review = extractReview({
      summary: "Lockfile only.",
      issues: [
        {
          severity: "nit",
          lens: "conventions",
          file: "pnpm-lock.yaml",
          line: 4,
          description: "hash changed",
          suggestion: "",
        },
        valid.issues[0],
      ],
    });
    expect(review.issues).toEqual(valid.issues);
  });

  it("rejects output that is not a review", () => {
    expect(() => extractReview({ text: "nope" })).toThrow(/did not contain a review object/);
  });
});

describe("buildReview", () => {
  it("posts in-diff issues inline and promotes the rest", () => {
    const built = buildReview({
      commit: "abc123",
      diff: sampleDiff,
      review: {
        summary: "UI fetch plus a parse guard.",
        issues: [
          {
            severity: "bug",
            lens: "conventions",
            file: "packages/ui/src/widget.tsx",
            line: 2,
            description: "UI calls fetch directly.",
            suggestion: "Move the request into @lisca/client.",
          },
          {
            severity: "suggestion",
            lens: "correctness",
            file: "packages/utils/src/foo.ts",
            line: 99,
            description: "Line is not in this diff.",
            suggestion: "Ignore me inline.",
          },
        ],
      },
    });

    expect(built.bugCount).toBe(1);
    expect(built.suggestionCount).toBe(1);
    expect(built.inlineCount).toBe(1);
    expect(built.bodyCount).toBe(1);
    expect(built.payload.event).toBe("COMMENT");
    expect(built.payload.commit_id).toBe("abc123");
    expect(built.payload.comments).toEqual([
      {
        path: "packages/ui/src/widget.tsx",
        line: 2,
        side: "RIGHT",
        body: "**[bug · conventions]** UI calls fetch directly.\n\n**Suggestion:** Move the request into @lisca/client.",
      },
    ]);
    expect(built.payload.body).toContain("packages/utils/src/foo.ts:99");
    expect(built.payload.body).toContain("Automated CI; not a human approval.");
  });
});

describe("fail-on", () => {
  it("accepts bugs or none", () => {
    expect(parseFailOn(undefined)).toBe("bugs");
    expect(parseFailOn("")).toBe("bugs");
    expect(parseFailOn("bugs")).toBe("bugs");
    expect(parseFailOn("none")).toBe("none");
    expect(() => parseFailOn("all")).toThrow(/bugs" or "none/);
  });

  it("fails the check only for bug-severity findings", () => {
    expect(shouldFailCheck("bugs", 1)).toBe(true);
    expect(shouldFailCheck("bugs", 0)).toBe(false);
    expect(shouldFailCheck("none", 4)).toBe(false);
  });
});

describe("payload write smoke", () => {
  it("serializes a valid GitHub review payload", () => {
    const built = buildReview({
      commit: "deadbeef",
      diff: sampleDiff,
      review: { summary: "Looks fine.", issues: [] },
    });
    const dir = mkdtempSync(join(tmpdir(), "grok-review-"));
    const path = join(dir, "payload.json");
    writeFileSync(path, JSON.stringify(built.payload));
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { comments: unknown[] };
    expect(parsed.comments).toEqual([]);
  });
});
