# Killing ResNet model

**Ownership:** killing assay / Hugging Face
[`keejkrej/killing-assay-resnet18`](https://huggingface.co/keejkrej/killing-assay-resnet18),
not a lisca-owned analysis brain. This directory is a **package-time cache**
so Studio installers can curl the ONNX (see `.github/workflows/release.yml`).
Keep that curl-at-package-time path; do not grow a third copy of training or
weights logic here. When a killing sidecar exists, it owns the brain.

Studio killing analysis expects `model.onnx` in this **package-time cache**
(or `LISCA_KILL_MODEL` pointing elsewhere). Do not treat this as a second
training tree.

The published ONNX (what release.yml curls):

```sh
curl -sL "https://huggingface.co/keejkrej/killing-assay-resnet18/resolve/main/model.onnx" \
  -o ./models/killing-assay-resnet18/model.onnx
```

The classifier is a binary ResNet-18 (`absent` / `present`) trained for T-cell killing assays. Inference outputs **P(dead) = P(absent)** per ROI frame; `present` means a surviving cell on the micropattern.

Preprocessing matches the Hugging Face image processor: min–max normalize crop to uint8, resize to 224×224, grayscale → RGB, ImageNet mean/std normalization.
