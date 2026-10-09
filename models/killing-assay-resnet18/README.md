# Killing ResNet model

**Ownership:** killing assay / Hugging Face
[`keejkrej/killing-assay-resnet18`](https://huggingface.co/keejkrej/killing-assay-resnet18),
not a lisca-owned analysis brain. This directory is a **local cache** for
developers. Studio installers do not ship the ONNX. Do not grow a second
training tree here. When a killing sidecar exists, it owns the brain.

Studio killing analysis resolves `model.onnx` from `LISCA_KILL_MODEL` or from
this cache when it is present. A packaged app has neither until someone places
the file.

Download the published ONNX for a local run:

```sh
curl -sL "https://huggingface.co/keejkrej/killing-assay-resnet18/resolve/main/model.onnx" \
  -o ./models/killing-assay-resnet18/model.onnx
```

The classifier is a binary ResNet-18 (`absent` / `present`) trained for T-cell killing assays. Inference outputs **P(dead) = P(absent)** per ROI frame; `present` means a surviving cell on the micropattern.

Preprocessing matches the Hugging Face image processor: min–max normalize crop to uint8, resize to 224×224, grayscale → RGB, ImageNet mean/std normalization.
