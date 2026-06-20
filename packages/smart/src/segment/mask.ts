export function applyBinaryMask(mask: Uint8Array, binary: Uint8Array, value: number): Uint8Array {
  const next = mask.slice();
  const length = Math.min(next.length, binary.length);
  for (let index = 0; index < length; index += 1) {
    if (binary[index]) next[index] = value;
  }
  return next;
}
