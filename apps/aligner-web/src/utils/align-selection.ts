export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function selectedIndex(values: number[] | undefined, value: number): number {
  return Math.max(0, values?.indexOf(value) ?? 0);
}
