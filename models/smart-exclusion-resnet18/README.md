---
license: mit
tags:
  - image-classification
  - onnx
  - biology
  - microscopy
library_name: transformers.js
pipeline_tag: image-classification
---

# Smart exclusion ResNet-18

**Ownership:** this lisca monorepo (product / any-assay). Smart exclude is not
an assay pipeline.

Binary image classifier for LiSCA **Smart exclude**: predicts whether a micropattern grid cell ROI should be excluded from downstream ROI export.

Trained on user-preference exclusions (edge-clipped sites filtered out). Labels:

| ID  | Label     |
| --- | --------- |
| 0   | `exclude` |
| 1   | `include` |

## Preprocessing

Matches `export_meta.json`:

- Crop cell ROI, min–max normalize to uint8
- Resize to 224×224
- Grayscale → RGB
- ImageNet mean/std normalization

## Usage (transformers.js)

```js
import { pipeline } from "@huggingface/transformers";

const classifier = await pipeline("image-classification", "keejkrej/smart-exclusion-resnet18");
const outputs = await classifier(image);
// exclude when P(label=exclude) >= 0.5
```

## Refresh from training

```sh
cp /path/to/runs/<timestamp>/model.onnx ./onnx/model.onnx
cp /path/to/runs/<timestamp>/export_meta.json ./export_meta.json
```
