export function pickBestMaskIndex(scores: ArrayLike<number>): number {
  let bestIndex = 0;
  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index]! > scores[bestIndex]!) bestIndex = index;
  }
  return bestIndex;
}

export function extractBestMask(
  maskTensor: { data: ArrayLike<number | boolean>; dims: number[] },
  scores: ArrayLike<number>,
  width: number,
  height: number,
): Uint8Array {
  const pixelCount = width * height;
  const out = new Uint8Array(pixelCount);
  const data = maskTensor.data;
  const dims = maskTensor.dims;

  if (dims.length === 2) {
    for (let index = 0; index < pixelCount; index += 1) {
      if (data[index]) out[index] = 1;
    }
    return out;
  }

  const bestIndex = pickBestMaskIndex(scores);
  let numMasks = scores.length;
  let tensorHeight = height;
  let tensorWidth = width;

  if (dims.length === 4) {
    numMasks = dims[1]!;
    tensorHeight = dims[2]!;
    tensorWidth = dims[3]!;
  } else if (dims.length === 3) {
    numMasks = dims[0]!;
    tensorHeight = dims[1]!;
    tensorWidth = dims[2]!;
  } else {
    throw new Error(`Unsupported SAM mask tensor shape: [${dims.join(", ")}]`);
  }

  const planeSize = tensorHeight * tensorWidth;
  if (planeSize !== pixelCount) {
    throw new Error(
      `SAM mask size mismatch: tensor ${tensorWidth}x${tensorHeight}, frame ${width}x${height}`,
    );
  }

  if (bestIndex >= numMasks) {
    throw new Error(`SAM mask index ${bestIndex} out of range for ${numMasks} masks`);
  }

  const offset = bestIndex * planeSize;
  for (let index = 0; index < pixelCount; index += 1) {
    if (data[offset + index]) out[index] = 1;
  }
  return out;
}
