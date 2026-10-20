import type { TextContent, ImageContent } from "@modelcontextprotocol/sdk/types.js";
import { isPng, renderFrame, type ContrastWindow, type FramePixels } from "./images.ts";

/** Cap for tool JSON output; the product API can return big tables. */
export const MAX_TEXT_CHARS = 100_000;

export function textBlock(text: string): TextContent {
  return { type: "text", text };
}

export function imageBlock(png: Buffer): ImageContent {
  return { type: "image", data: png.toString("base64"), mimeType: "image/png" };
}

/** Pretty-print a JSON result for an agent, with a truncation notice when large. */
export function prettyJson(value: unknown, maxChars: number = MAX_TEXT_CHARS): string {
  const full = JSON.stringify(value, null, 2) ?? "null";
  if (full.length <= maxChars) {
    return full;
  }
  const cut = full.slice(0, maxChars);
  return `${cut}\n… [lisca-mcp truncated output: ${maxChars} of ${full.length} characters. Read specific pieces with workspace_read_file or a narrower query.]`;
}

/**
 * Deep-copy a JSON value with the bulky base64 fields replaced by markers, so
 * tool text stays readable while the pixels travel as an image block.
 */
export function stripBase64Fields(value: unknown, fields: string[]): unknown {
  const wanted = new Set(fields);
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(visit);
    }
    if (typeof node === "object" && node !== null) {
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(node)) {
        if (wanted.has(key) && typeof child === "string" && child.length > 0) {
          out[key] = `<${child.length} base64 characters omitted>`;
        } else {
          out[key] = visit(child);
        }
      }
      return out;
    }
    return node;
  };
  return visit(value);
}

/**
 * Build the content blocks for a frame-returning contract response: a PNG the
 * agent can view, plus the payload JSON with `dataBase64` replaced by a marker.
 */
export function frameContent(payload: FramePixels, contrast?: ContrastWindow | null) {
  const rendered = renderFrame(payload, contrast);
  const summary = stripBase64Fields(payload, ["dataBase64"]) as Record<string, unknown>;
  const text = prettyJson({
    ...summary,
    renderedContrast: rendered.applied,
    rawPixelMin: rendered.pixelMin,
    rawPixelMax: rendered.pixelMax,
    renderedPng: `${rendered.png.length} bytes`,
  });
  return { content: [imageBlock(rendered.png), textBlock(text)], rendered };
}

/** Content blocks for a mask-PNG-carrying response (annotation loads). */
export function maskContent(payload: Record<string, unknown>, maskField: string) {
  const raw = payload[maskField];
  const blocks: (ImageContent | TextContent)[] = [];
  if (typeof raw === "string" && raw.length > 0) {
    const png = Buffer.from(raw, "base64");
    if (isPng(png)) {
      blocks.push(imageBlock(png));
    }
  }
  blocks.push(textBlock(prettyJson(stripBase64Fields(payload, [maskField]))));
  return { content: blocks };
}
