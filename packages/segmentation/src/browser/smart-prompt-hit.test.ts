import { describe, expect, it } from "vitest";

const PROMPT_HIT_RADIUS = 12;

function findPromptIndexAt(
  prompts: Array<{ x: number; y: number; label: 0 | 1 }>,
  x: number,
  y: number,
  radius = PROMPT_HIT_RADIUS,
): number {
  const radiusSq = radius * radius;
  let bestIndex = -1;
  let bestDistanceSq = radiusSq;
  for (let index = 0; index < prompts.length; index += 1) {
    const prompt = prompts[index]!;
    const dx = prompt.x - x;
    const dy = prompt.y - y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq <= bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestIndex = index;
    }
  }
  return bestIndex;
}

describe("smart prompt hit test", () => {
  it("finds the nearest prompt within radius", () => {
    const prompts = [
      { x: 10, y: 10, label: 1 as const },
      { x: 50, y: 50, label: 0 as const },
    ];
    expect(findPromptIndexAt(prompts, 12, 11)).toBe(0);
    expect(findPromptIndexAt(prompts, 48, 52)).toBe(1);
    expect(findPromptIndexAt(prompts, 0, 0)).toBe(-1);
  });
});
