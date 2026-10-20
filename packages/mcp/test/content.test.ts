import { describe, expect, it } from "vitest";

import { frameContent, maskContent, prettyJson, stripBase64Fields } from "../src/content.ts";
import { encodeGrayPng } from "../src/images.ts";

describe("prettyJson", () => {
  it("pretty-prints objects", () => {
    expect(prettyJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("truncates large output with a notice", () => {
    const text = prettyJson({ blob: "x".repeat(500) }, 100);
    expect(text.length).toBeLessThanOrEqual(100 + 300);
    expect(text).toContain("truncated");
    expect(text).not.toContain("null\n]");
  });

  it("serializes null and undefined", () => {
    expect(prettyJson(null)).toBe("null");
    // undefined has no JSON form; keep the output parseable.
    expect(prettyJson(undefined)).toBe("null");
  });
});

describe("stripBase64Fields", () => {
  it("replaces bulky base64 fields and leaves everything else", () => {
    const value = {
      width: 2,
      dataBase64: "AAAA",
      nested: [{ dataBase64: "BBBB", maskBase64Png: "CCCC", ok: true }],
    };
    const stripped = stripBase64Fields(value, ["dataBase64", "maskBase64Png"]) as typeof value;
    expect(stripped.width).toBe(2);
    expect(stripped.dataBase64).toMatch(/omitted/);
    expect(stripped.nested[0].dataBase64).toMatch(/omitted/);
    expect(stripped.nested[0].maskBase64Png).toMatch(/omitted/);
    expect(stripped.nested[0].ok).toBe(true);
  });
});

describe("frameContent", () => {
  it("returns an image block plus JSON with the pixels replaced", () => {
    const pixels = new Uint8Array([0, 255]);
    const png = encodeGrayPng(2, 1, pixels);
    const { content } = frameContent({
      width: 2,
      height: 1,
      dataBase64: Buffer.from(pixels).toString("base64"),
      pixelType: "uint8",
    });
    expect(content).toHaveLength(2);
    const [image, text] = content;
    expect(image.type).toBe("image");
    expect((image as { mimeType: string }).mimeType).toBe("image/png");
    expect(Buffer.from((image as { data: string }).data, "base64").equals(png)).toBe(true);
    const parsed = JSON.parse((text as { text: string }).text) as {
      dataBase64: string;
      renderedContrast: { min: number; max: number };
      rawPixelMin: number;
      rawPixelMax: number;
    };
    expect(parsed.dataBase64).toMatch(/omitted/);
    expect(parsed.renderedContrast).toEqual({ min: 0, max: 255 });
    expect(parsed.rawPixelMin).toBe(0);
    expect(parsed.rawPixelMax).toBe(255);
  });
});

describe("maskContent", () => {
  it("embeds the mask PNG when present and strips it from the JSON", () => {
    // The contract puts maskBase64Png at the top level of
    // LoadedRoiFrameAnnotation, next to the saved annotation object.
    const mask = encodeGrayPng(1, 1, new Uint8Array([1]));
    const { content } = maskContent(
      {
        annotation: {
          pos: 1,
          roi: 2,
          channel: 0,
          time: 0,
          z: 0,
          labelId: "cell",
          maskBase64Png: null,
        },
        maskBase64Png: mask.toString("base64"),
      },
      "maskBase64Png",
    );
    expect(content).toHaveLength(2);
    expect(content[0].type).toBe("image");
    const text = (content[1] as { text: string }).text;
    expect(text).not.toContain("iVBOR");
    expect(JSON.parse(text)).toMatchObject({
      maskBase64Png: expect.stringMatching(/omitted/),
    });
  });

  it("still returns JSON when the mask is missing", () => {
    const { content } = maskContent({ annotation: null }, "maskBase64Png");
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("text");
  });
});
