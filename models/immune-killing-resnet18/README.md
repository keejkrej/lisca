# Immune killing ResNet model

Studio immune killing analysis expects `model.onnx` in this directory (or `LISCA_KILL_MODEL` pointing elsewhere).

Export from the Hugging Face checkpoint:

```sh
uv run optimum-cli export onnx --model keejkrej/immune-killing-resnet18 ./models/immune-killing-resnet18
```

Or download the published ONNX artifact:

```sh
curl -sL "https://huggingface.co/keejkrej/immune-killing-resnet18/resolve/main/model.onnx" \
  -o ./models/immune-killing-resnet18/model.onnx
```

The classifier is a binary ResNet-18 (`absent` / `present`) trained for T-cell killing assays. Inference outputs **P(dead) = P(absent)** per ROI frame; `present` means a surviving cell on the micropattern.

Preprocessing matches the Hugging Face image processor: min–max normalize crop to uint8, resize to 224×224, grayscale → RGB, ImageNet mean/std normalization.
